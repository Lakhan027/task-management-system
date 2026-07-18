import Task from '../models/mongodb/Task.js';
import ActivityLog from '../models/mongodb/ActivityLog.js';
import redisHelpers from '../config/redis.js';
export class TaskService {
    /**
     * Create a new task
     */
    async createTask(data, userId) {
        // Validate status if provided
        if (data.status) {
            const validStatuses = ['todo', 'in-progress', 'review', 'done'];
            if (!validStatuses.includes(data.status)) {
                throw new Error(`Invalid status: ${data.status}`);
            }
        }
        const task = new Task({
            ...data,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await task.save();
        await this.logActivity({
            userId,
            action: 'create',
            resourceType: 'task',
            resourceId: task._id.toString(),
            changes: { task: data },
        });
        //invalidate cache for task list and stats after creating a new task
        await redisHelpers.deletePattern('tasks:list:*');
        await redisHelpers.deletePattern('tasks:stats:*');
        await redisHelpers.deletePattern(`tasks:detail:*`);
        return task;
    }
    /**
     * Get all tasks with filters & pagination
     */
    async getTasks(userId, filters = {}) {
        const query = {
            $or: [{ assignedTo: userId }, { createdBy: userId }],
        };
        if (filters.status)
            query.status = filters.status;
        if (filters.priority)
            query.priority = filters.priority;
        if (filters.tags) {
            const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
            query.tags = { $in: tagsArray };
        }
        if (filters.projectId)
            query.projectId = filters.projectId;
        if (filters.dueDateBefore) {
            query.dueDate = { $lte: new Date(filters.dueDateBefore) };
        }
        if (filters.dueDateAfter) {
            query.dueDate = { $gte: new Date(filters.dueDateAfter) };
        }
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const [tasks, total] = await Promise.all([
            Task.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(), // return plain objects for performance
            Task.countDocuments(query),
        ]);
        return {
            tasks: tasks,
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
    async getTaskById(taskId, userId) {
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
    async updateTask(taskId, updates, userId) {
        const task = await this.getTaskById(taskId, userId);
        // Track changes for logging
        const changes = {};
        const updateKeys = Object.keys(updates);
        updateKeys.forEach((key) => {
            const updateValue = updates[key];
            // Only track if the value is actually different and not undefined
            if (updateValue !== undefined) {
                const taskValue = task[key];
                if (taskValue !== updateValue) {
                    changes[key] = { from: taskValue, to: updateValue };
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
    async updateStatus(taskId, status, userId) {
        const validStatuses = ['todo', 'in-progress', 'review', 'done'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
        }
        const newStatus = status;
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
    async deleteTask(taskId, userId) {
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
    async addComment(taskId, userId, text) {
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
    async getTaskStats(userId) {
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
        const result = {
            todo: 0,
            'in-progress': 0,
            review: 0,
            done: 0,
        };
        stats.forEach((item) => {
            result[item._id] = item.count;
        });
        return {
            total,
            stats: result,
        };
    }
    /**
     * Helper: Log activity (private)
     */
    async logActivity(data) {
        try {
            const log = new ActivityLog(data);
            await log.save();
        }
        catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}
