import Task from '../models/mongodb/Task.js';
import ActivityLog from '../models/mongodb/ActivityLog.js';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  TaskStatus,
  ITask,
} from '../types/task.js';
import redisHelpers from '../config/redis.js';
import { trace } from '../utils/trace.js';

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(data: CreateTaskRequest, userId: number): Promise<ITask> {
    // Validate status if provided
    if (data.status) {
      const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
      if (!validStatuses.includes(data.status)) {
        throw new Error(`Invalid status: ${data.status}`);
      }
    }

    trace('12a', 'SERVICE → naya Task object bana raha hoon');
    const task = new Task({
      ...data,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    trace('12b', 'SERVICE → MONGODB me task LIKH raha hoon ✍️');
    await task.save();

    trace('12c', 'SERVICE → MONGODB me ActivityLog LIKH raha hoon ✍️ (ek request, DO writes)');
    await this.logActivity({
      userId,
      action: 'create',
      resourceType: 'task',
      resourceId: task._id.toString(),
      changes: { task: data },
    });
    
    trace('12e', 'SERVICE → CACHE TOD raha hoon 💥 (POST todta hai, GET padhta hai)');
    //invalidate cache for task list and stats after creating a new task
    await redisHelpers.deletePattern('tasks:list:*');
    await redisHelpers.deletePattern('tasks:stats:*');
    await redisHelpers.deletePattern(`tasks:detail:*`);

    return task;
  }

  /**
   * Get all tasks with filters & pagination
   */
  async getTasks(userId: number, filters: TaskFilters = {}): Promise<{
    tasks: ITask[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    console.log('STOP 12: MongoDB jaa raha hoon');
    const query: any = {
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    };

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.tags) {
      const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      query.tags = { $in: tagsArray };
    }
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.dueDateBefore) {
      query.dueDate = { $lte: new Date(filters.dueDateBefore) };
    }
    if (filters.dueDateAfter) {
      query.dueDate = { $gte: new Date(filters.dueDateAfter) };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    trace('12', 'SERVICE → MONGODB se PADH raha hoon 📖', JSON.stringify(query));
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // return plain objects for performance
      Task.countDocuments(query),
    ]);

    return {
      tasks: tasks as ITask[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single task by ID (with authorization check)
   */
  async getTaskById(taskId: string, userId: number): Promise<ITask> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found`);
    }

    if (task.assignedTo !== userId && task.createdBy !== userId) {
      throw new Error('Unauthorized to view this task');
    }

    return task;
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    updates: UpdateTaskRequest,
    userId: number
  ): Promise<ITask> {
    const task = await this.getTaskById(taskId, userId);

    // Track changes for logging
    const changes: Record<string, { from: any; to: any }> = {};
    const updateKeys = Object.keys(updates) as (keyof UpdateTaskRequest)[];

    updateKeys.forEach((key) => {
      const updateValue = updates[key];
      // Only track if the value is actually different and not undefined
      if (updateValue !== undefined) {
        const taskValue = task[key as keyof ITask];
        if (taskValue !== updateValue) {
          changes[key as string] = { from: taskValue, to: updateValue };
        }
      }
    });

    // Apply updates
    Object.assign(task, updates);
    task.updatedAt = new Date();
    await task.save();

    if (Object.keys(changes).length > 0) {
      await this.logActivity({
        userId,
        action: 'update',
        resourceType: 'task',
        resourceId: task._id.toString(),
        changes,
      });
    }

     // ✅ Invalidate related caches
    await redisHelpers.deletePattern('tasks:list:*');
    await redisHelpers.deletePattern('tasks:stats:*');
    await redisHelpers.deletePattern(`tasks:detail:*`);
    await redisHelpers.delete(`tasks:detail:${taskId}`);

    return task;
  }

  /**
   * Update task status
   */
  async updateStatus(
    taskId: string,
    status: string,
    userId: number
  ): Promise<ITask> {
    const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
    if (!validStatuses.includes(status as TaskStatus)) {
      throw new Error(
        `Invalid status: "${status}". Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const newStatus = status as TaskStatus;
    const task = await this.getTaskById(taskId, userId);

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date();

    if (newStatus === 'done') {
      task.completedAt = new Date();
    }

    await task.save();

    await this.logActivity({
      userId,
      action: 'status_change',
      resourceType: 'task',
      resourceId: task._id.toString(),
      changes: {
        status: { from: oldStatus, to: newStatus },
      },
    });

    // ✅ Invalidate related caches
    await redisHelpers.deletePattern('tasks:list:*');
    await redisHelpers.deletePattern('tasks:stats:*');
    await redisHelpers.delete(`tasks:detail:${taskId}`);

    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId: number): Promise<{ message: string }> {
    const task = await this.getTaskById(taskId, userId);

    if (task.createdBy !== userId) {
      throw new Error('Only the creator can delete this task');
    }

    await task.deleteOne();

    await this.logActivity({
      userId,
      action: 'delete',
      resourceType: 'task',
      resourceId: taskId,
      changes: { deleted: task },
    });

     // ✅ Invalidate all task caches
     await redisHelpers.deletePattern('tasks:*');

    return { message: 'Task deleted successfully' };
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: string,
    userId: number,
    text: string
  ): Promise<ITask> {
    const task = await this.getTaskById(taskId, userId);

    task.comments.push({
      userId,
      text,
      createdAt: new Date(),
    });
    task.updatedAt = new Date();
    await task.save();

    await this.logActivity({
      userId,
      action: 'comment',
      resourceType: 'task',
      resourceId: task._id.toString(),
      changes: { comment: text },
    });


    // ✅ Invalidate related caches
    await redisHelpers.delete(`tasks:detail:${taskId}`);

    return task;
  }

  /**
   * Get task statistics (dashboard)
   */
  async getTaskStats(userId: number): Promise<{
    total: number;
    stats: Record<TaskStatus, number>;
  }> {
    const stats = await Task.aggregate([
      {
        $match: {
          $or: [{ assignedTo: userId }, { createdBy: userId }],
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Task.countDocuments({
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    });

    const result: Record<TaskStatus, number> = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0,
    };

    stats.forEach((item: any) => {
      result[item._id as TaskStatus] = item.count;
    });

    return {
      total,
      stats: result,
    };
  }

  /**
   * Helper: Log activity (private)
   */
  private async logActivity(data: any): Promise<void> {
    try {
      const log = new ActivityLog(data);
      await log.save();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}