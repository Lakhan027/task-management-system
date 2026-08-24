// src/controllers/dashboardController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import mongoose from 'mongoose';
import redisHelpers from '../config/redis.js';
import Task from '../models/mongodb/Task.js';
import Project from '../models/mongodb/Project.js';
import ActivityLog from '../models/mongodb/ActivityLog.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/dashboard
 * Get live data from all databases: PostgreSQL, MongoDB, Redis.
 * - Admin: sees all data
 * - Regular user: sees only their own data (tasks, projects, logs, and only their own user record)
 */
export const getDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ──────────────────────────────────────────────
    // 0. Get User Info from authenticated request
    // ──────────────────────────────────────────────
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role || 'user'; // 'admin' or 'user'

    // ──────────────────────────────────────────────
    // 1. PostgreSQL – Users
    // ──────────────────────────────────────────────
    let users, userCount;

    if (userRole === 'admin') {
      // ✅ Admin: see all users
      users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      userCount = await prisma.user.count();
    } else {
      // ✅ User: see only themselves
      users = await prisma.user.findMany({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      userCount = 1;
    }

    // ──────────────────────────────────────────────
    // 2. MongoDB – Tasks
    // ──────────────────────────────────────────────
    let taskFilter = {};
    if (userRole !== 'admin') {
      // Regular user: only tasks assigned to or created by them
      taskFilter = {
        $or: [{ assignedTo: userId }, { createdBy: userId }],
      };
    }
    const tasks = await Task.find(taskFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const taskCount = await Task.countDocuments(taskFilter);

    // ──────────────────────────────────────────────
    // 3. MongoDB – Projects
    // ──────────────────────────────────────────────
    let projectFilter = {};
    if (userRole !== 'admin') {
      // Regular user: projects where they are owner or member
      projectFilter = {
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      };
    }
    const projects = await Project.find(projectFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const projectCount = await Project.countDocuments(projectFilter);

    // ──────────────────────────────────────────────
    // 4. MongoDB – ActivityLogs
    // ──────────────────────────────────────────────
    let logFilter = {};
    if (userRole !== 'admin') {
      // Regular user: only their own activity logs
      logFilter = { userId: userId };
    }
    const logs = await ActivityLog.find(logFilter)
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    const logCount = await ActivityLog.countDocuments(logFilter);

    // ──────────────────────────────────────────────
    // 5. MongoDB – Task counts by status & priority
    // ──────────────────────────────────────────────
    const [tasksByStatus, tasksByPriority] = await Promise.all([
      Task.aggregate([
        { $match: taskFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: taskFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    // ──────────────────────────────────────────────
    // 6. Redis – keys scoped by user
    // ──────────────────────────────────────────────
    const allRedisKeys = await redisHelpers.keys('*');
    const userKeyPatterns = [
      `*user:${userId}*`,
      `*:${userId}:*`,
      `rate_limit:${userId}:*`,
      `session:${userId}:*`,
      `user:${userId}:*`,
    ];
    const userRedisKeys = allRedisKeys.filter((key) =>
      userKeyPatterns.some((p) => {
        const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
        return regex.test(key);
      })
    );
    // Also include blacklist keys and general keys for learning
    const learningKeys = allRedisKeys.filter((key) =>
      key.startsWith('blacklist:') || key.startsWith('tasks:') || key.startsWith('project:')
    );
    const mergedKeys = [...new Set([...userRedisKeys, ...learningKeys])];

    const redisKeySamples = await Promise.all(
      mergedKeys.slice(0, 30).map(async (key) => {
        const type = await redisHelpers.getType(key);
        const ttl = await redisHelpers.getTTL(key);
        const raw = await redisHelpers.get(key);
        let value = raw;
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        if (str && str.length > 200) {
          value = str.substring(0, 200) + '...';
        }
        return { key, type, ttl, value };
      })
    );
    const redisConnected = await redisHelpers.isConnected();

    const data = {
      postgresql: {
        connected: true,
        userCount,
        recentUsers: users,
      },
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        taskCount,
        projectCount,
        logCount,
        recentTasks: tasks,
        recentProjects: projects,
        recentLogs: logs,
        tasksByStatus: Object.fromEntries(
          tasksByStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
        ),
        tasksByPriority: Object.fromEntries(
          tasksByPriority.map((p: { _id: string; count: number }) => [p._id, p.count])
        ),
      },
      redis: {
        connected: redisConnected,
        totalKeys: allRedisKeys.length,
        userKeyCount: mergedKeys.length,
        keySamples: redisKeySamples,
      },
      user: {
        id: userId,
        role: userRole,
      },
      timestamp: new Date().toISOString(),
    };

    sendSuccess(res, 200, 'Dashboard data retrieved successfully', data);
    return;
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/health
 * Simple health check with counts.
 * - Admin: shows counts for all resources
 * - Regular user: shows only their own counts
 */
export const getHealthStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role || 'user';

    // Build filters based on role
    const taskFilter = userRole === 'admin' ? {} : { $or: [{ assignedTo: userId }, { createdBy: userId }] };
    const projectFilter = userRole === 'admin' ? {} : { $or: [{ ownerId: userId }, { 'members.userId': userId }] };
    const logFilter = userRole === 'admin' ? {} : { userId: userId };

    const [userCount, taskCount, projectCount, logCount, redisConnected] =
      await Promise.all([
        userRole === 'admin' ? prisma.user.count() : 1, // admin sees all, user sees 1 (themselves)
        Task.countDocuments(taskFilter),
        Project.countDocuments(projectFilter),
        ActivityLog.countDocuments(logFilter),
        redisHelpers.isConnected(),
      ]);

    const healthData = {
      postgresql: { users: userCount },
      mongodb: { tasks: taskCount, projects: projectCount, logs: logCount },
      redis: { connected: redisConnected },
      user: {
        id: userId,
        role: userRole,
      },
      timestamp: new Date().toISOString(),
    };

    sendSuccess(res, 200, 'Dashboard health retrieved successfully', healthData);
    return;
  } catch (error) {
    next(error);
  }
};