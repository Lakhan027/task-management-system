import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
  RemoveMemberRequest,
} from '../types/project.js';
import { sendError, sendSuccess } from '../utils/response.js';

const projectService = new ProjectService();

export class ProjectController {
  /**
   * POST /api/projects
   * Create a new project
   */
  async createProject(
    req: Request<{}, {}, CreateProjectRequest>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const projectData = req.body;

    if (!projectData.name) {
      return sendError(res, 400, 'Project name is required');
    }

    const project = await projectService.createProject(projectData, userId);
    return sendSuccess(res, 201, 'Project created successfully', project);
  }

  /**
   * GET /api/projects
   * Get all projects for the authenticated user
   */
  async getProjects(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const projects = await projectService.getProjects(userId);
    return sendSuccess(res, 200, 'Projects retrieved successfully', projects);
  }

  /**
   * GET /api/projects/:id
   * Get a single project by ID
   */
  async getProject(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const project = await projectService.getProjectById(id, userId);
    return sendSuccess(res, 200, 'Project retrieved successfully', project);
  }

  /**
   * PUT /api/projects/:id
   * Update a project
   */
  async updateProject(
    req: Request<{ id: string }, {}, UpdateProjectRequest>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const project = await projectService.updateProject(id, req.body, userId);
    return sendSuccess(res, 200, 'Project updated successfully', project);
  }

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  async deleteProject(req: Request<{ id: string }>, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const result = await projectService.deleteProject(id, userId);
    return sendSuccess(res, 200, 'Project deleted successfully', result);
  }

  /**
   * POST /api/projects/:id/members
   * Add a member to a project
   */
  async addMember(
    req: Request<{ id: string }, {}, AddMemberRequest>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { memberUserId, role } = req.body;

    if (!memberUserId) {
      return sendError(res, 400, 'Member user ID is required');
    }

    const project = await projectService.addMember(
      id,
      userId,
      memberUserId,
      role
    );
    return sendSuccess(res, 200, 'Member added successfully', project);
  }

  /**
   * DELETE /api/projects/:id/members
   * Remove a member from a project
   */
  async removeMember(
    req: Request<{ id: string }, {}, RemoveMemberRequest>,
    res: Response
  ) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { memberUserId } = req.body;

    if (!memberUserId) {
      return sendError(res, 400, 'Member user ID is required');
    }

    const project = await projectService.removeMember(id, userId, memberUserId);
    return sendSuccess(res, 200, 'Member removed successfully', project);
  }
}