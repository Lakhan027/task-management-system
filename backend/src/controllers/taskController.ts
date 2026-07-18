import { Request, Response } from 'express';
import { TaskService } from '../services/taskService.js';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
} from '../types/task.js';

const taskService = new TaskService();

export class TaskController {
  /**
   * POST /api/tasks
   * Create a new task
   */
  async createTask(req: Request<{}, {}, CreateTaskRequest>, res: Response) {

    console.log('Received request to create task:');
    const userId = (req as any).user.id;
    const taskData = req.body;

    // Basic validation
    if (!taskData.title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    if (!taskData.assignedTo) {
      return res.status(400).json({ error: 'Task must be assigned to someone' });
    }

    const task = await taskService.createTask(taskData, userId);
    res.status(201).json(task);
  }

  /**
   * GET /api/tasks
   * Get all tasks with filters & pagination
   */
  async getTasks(req: Request<{}, {}, {}, TaskFilters>, res: Response) {
    const userId = (req as any).user.id;
    const filters = req.query;
    const result = await taskService.getTasks(userId, filters);
    res.json(result);
  }

  /**
   * GET /api/tasks/:id
   * Get a single task by ID
   */
  async getTask(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const task = await taskService.getTaskById(id, userId);
    res.json(task);
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
    res.json(task);
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
      return res.status(400).json({ error: 'Status is required' });
    }

    const task = await taskService.updateStatus(id, status, userId);
    res.json(task);
  }

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  async deleteTask(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const result = await taskService.deleteTask(id, userId);
    res.json(result);
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
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const task = await taskService.addComment(id, userId, text);
    res.json(task);
  }

  /**
   * GET /api/tasks/stats
   * Get task statistics for the authenticated user
   */
  async getStats(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const stats = await taskService.getTaskStats(userId);
    res.json(stats);
  }
}