import Project from '../models/mongodb/Project.js';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
  IProject,
  ProjectStatus,
  ProjectVisibility,
  MemberRole,
} from '../types/project.js';


export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(data: CreateProjectRequest, userId: number): Promise<IProject> {
    const project = new Project({
      ...data,
      ownerId: userId,
      members: [{ userId, role: 'admin', joinedAt: new Date() }],
    });

    await project.save();
    return project;
  }

  /**
   * Get all projects for a user (where user is owner or member)
   */
  async getProjects(userId: number): Promise<IProject[]> {
    return await Project.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    });
  }

  /**
   * Get a single project by ID (with authorization check)
   */
  async getProjectById(projectId: string, userId: number): Promise<IProject> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found`);
    }

    const hasAccess =
      project.ownerId === userId ||
      project.members.some((m: any) => m.userId === userId);
    if (!hasAccess) {
      throw new Error('Unauthorized to view this project');
    }

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    updates: UpdateProjectRequest,
    userId: number
  ): Promise<IProject> {
    const project = await this.getProjectById(projectId, userId);

    // Track changes for logging (optional, can be extended)
    const changes: Record<string, { from: any; to: any }> = {};
    const updateKeys = Object.keys(updates) as (keyof UpdateProjectRequest)[];

    updateKeys.forEach((key) => {
      const updateValue = updates[key];
      if (updateValue !== undefined) {
        const projectValue = project[key as keyof IProject];
        if (projectValue !== updateValue) {
          changes[key as string] = { from: projectValue, to: updateValue };
        }
      }
    });

    // Apply updates
    Object.assign(project, updates);
    project.updatedAt = new Date();
    await project.save();

    return project;
  }

  /**
   * Delete a project (only owner can delete)
   */
  async deleteProject(projectId: string, userId: number): Promise<{ message: string }> {
    const project = await this.getProjectById(projectId, userId);
    if (project.ownerId !== userId) {
      throw new Error('Only the owner can delete this project');
    }

    await project.deleteOne();
    return { message: 'Project deleted successfully' };
  }

  /**
   * Add a member to a project
   */
  async addMember(
    projectId: string,
    userId: number,
    memberUserId: number,
    role: MemberRole = 'member'
  ): Promise<IProject> {
    const project = await this.getProjectById(projectId, userId);

    // Check if user is owner or admin
    const isAdmin =
      project.ownerId === userId ||
      project.members.some((m: any) => m.userId === userId && m.role === 'admin');
    if (!isAdmin) {
      throw new Error('Only owner or admin can add members');
    }

    // Check if member already exists
    if (project.members.some((m: any) => m.userId === memberUserId)) {
      throw new Error('User is already a member');
    }

    project.members.push({ userId: memberUserId, role, joinedAt: new Date() });
    await project.save();
    return project;
  }

  /**
   * Remove a member from a project
   */
  async removeMember(
    projectId: string,
    userId: number,
    memberUserId: number
  ): Promise<IProject> {
    const project = await this.getProjectById(projectId, userId);

    if (project.ownerId !== userId) {
      throw new Error('Only the owner can remove members');
    }

    if (memberUserId === project.ownerId) {
      throw new Error('Cannot remove the project owner');
    }

    project.members = project.members.filter((m: any) => m.userId !== memberUserId);
    await project.save();
    return project;
  }
}