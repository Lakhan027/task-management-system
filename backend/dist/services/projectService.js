import { redisHelpers } from '../config/redis.js';
import Project from '../models/mongodb/Project.js';
export class ProjectService {
    /**
     * Create a new project
     */
    async createProject(data, userId) {
        const project = new Project({
            ...data,
            ownerId: userId,
            members: [{ userId, role: 'admin', joinedAt: new Date() }],
        });
        await project.save();
        // ✅ Invalidate project cache
        await redisHelpers.deletePattern('project:*');
        return project;
    }
    /**
     * Get all projects for a user (where user is owner or member)
     */
    async getProjects(userId) {
        return await Project.find({
            $or: [{ ownerId: userId }, { 'members.userId': userId }],
        });
    }
    /**
     * Get a single project by ID (with authorization check)
     */
    async getProjectById(projectId, userId) {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID "${projectId}" not found`);
        }
        const hasAccess = project.ownerId === userId ||
            project.members.some((m) => m.userId === userId);
        if (!hasAccess) {
            throw new Error('Unauthorized to view this project');
        }
        return project;
    }
    /**
     * Update a project
     */
    async updateProject(projectId, updates, userId) {
        const project = await this.getProjectById(projectId, userId);
        // Track changes for logging (optional, can be extended)
        const changes = {};
        const updateKeys = Object.keys(updates);
        updateKeys.forEach((key) => {
            const updateValue = updates[key];
            if (updateValue !== undefined) {
                const projectValue = project[key];
                if (projectValue !== updateValue) {
                    changes[key] = { from: projectValue, to: updateValue };
                }
            }
        });
        // Apply updates
        Object.assign(project, updates);
        project.updatedAt = new Date();
        await project.save();
        // ✅ Invalidate project cache
        await redisHelpers.deletePattern('project:*');
        return project;
    }
    /**
     * Delete a project (only owner can delete)
     */
    async deleteProject(projectId, userId) {
        const project = await this.getProjectById(projectId, userId);
        if (project.ownerId !== userId) {
            throw new Error('Only the owner can delete this project');
        }
        await project.deleteOne();
        // ✅ Invalidate project cache
        await redisHelpers.deletePattern('project:*');
        return { message: 'Project deleted successfully' };
    }
    /**
     * Add a member to a project
     */
    async addMember(projectId, userId, memberUserId, role = 'member') {
        const project = await this.getProjectById(projectId, userId);
        // Check if user is owner or admin
        const isAdmin = project.ownerId === userId ||
            project.members.some((m) => m.userId === userId && m.role === 'admin');
        if (!isAdmin) {
            throw new Error('Only owner or admin can add members');
        }
        // Check if member already exists
        if (project.members.some((m) => m.userId === memberUserId)) {
            throw new Error('User is already a member');
        }
        project.members.push({ userId: memberUserId, role, joinedAt: new Date() });
        await project.save();
        // ✅ Invalidate project cache
        await redisHelpers.deletePattern('project:*');
        return project;
    }
    /**
     * Remove a member from a project
     */
    async removeMember(projectId, userId, memberUserId) {
        const project = await this.getProjectById(projectId, userId);
        if (project.ownerId !== userId) {
            throw new Error('Only the owner can remove members');
        }
        if (memberUserId === project.ownerId) {
            throw new Error('Cannot remove the project owner');
        }
        project.members = project.members.filter((m) => m.userId !== memberUserId);
        await project.save();
        // ✅ Invalidate project cache
        await redisHelpers.deletePattern('project:*');
        return project;
    }
}
