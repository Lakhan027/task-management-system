import { Request, Response } from 'express';
import { TaskService } from '../services/taskService.js';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
} from '../types/task.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { trace } from '../utils/trace.js';

const taskService = new TaskService();

export class TaskController {
  /**
   * POST /api/tasks
   * Create a new task
   */
  async createTask(req: Request<{}, {}, CreateTaskRequest>, res: Response) {

    const userId = (req as any).user.id;
    const taskData = req.body;
    trace('11', 'CONTROLLER createTask → userId =', userId);

    // Basic validation
    if (!taskData.title) {
      return sendError(res, 400, 'Task title is required');
    }
    if (!taskData.assignedTo) {
      return sendError(res, 400, 'Task must be assigned to someone');
    }

    const task = await taskService.createTask(taskData, userId);
    return sendSuccess(res, 201, 'Task created successfully', task);
  }

  /**
   * GET /api/tasks
   * Get all tasks with filters & pagination
   */
  async getTasks(req: Request<{}, {}, {}, TaskFilters>, res: Response) {
    const userId = (req as any).user.id;
    const filters = req.query;
    trace('11', 'CONTROLLER getTasks → userId =', userId);
    const result = await taskService.getTasks(userId, filters);
    return sendSuccess(res, 200, 'Tasks retrieved successfully', result);
  }

  /**
   * GET /api/tasks/:id
   * Get a single task by ID
   */
  async getTask(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const task = await taskService.getTaskById(id, userId);
    return sendSuccess(res, 200, 'Task retrieved successfully', task);
  }

  /**
   * PUT /api/tasks/:id
   * Update a task
   */
  async updateTask(
    req: Request<{ id: string }, {}, UpdateTaskRequest>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const task = await taskService.updateTask(id, req.body, userId);
    return sendSuccess(res, 200, 'Task updated successfully', task);
  }

  /**
   * PATCH /api/tasks/:id/status
   * Update task status
   */
  async updateStatus(
    req: Request<{ id: string }, {}, { status: string }>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 400, 'Status is required');
    }

    const task = await taskService.updateStatus(id, status, userId);
    return sendSuccess(res, 200, 'Task status updated successfully', task);
  }

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  async deleteTask(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const result = await taskService.deleteTask(id, userId);
    return sendSuccess(res, 200, 'Task deleted successfully', result);
  }

  /**
   * POST /api/tasks/:id/comments
   * Add a comment to a task
   */
  async addComment(
    req: Request<{ id: string }, {}, { text: string }>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return sendError(res, 400, 'Comment text is required');
    }

    const task = await taskService.addComment(id, userId, text);
    return sendSuccess(res, 200, 'Comment added successfully', task);
  }

  /**
   * GET /api/tasks/stats
   * Get task statistics for the authenticated user
   */
  async getStats(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const stats = await taskService.getTaskStats(userId);
    return sendSuccess(res, 200, 'Task statistics retrieved successfully', stats);
  }
}