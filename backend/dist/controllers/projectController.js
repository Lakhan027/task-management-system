import { ProjectService } from '../services/projectService.js';
const projectService = new ProjectService();
export class ProjectController {
    /**
     * POST /api/projects
     * Create a new project
     */
    async createProject(req, res) {
        const userId = req.user.id;
        const projectData = req.body;
        if (!projectData.name) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        const project = await projectService.createProject(projectData, userId);
        res.status(201).json({ message: 'Project created successfully', project });
    }
    /**
     * GET /api/projects
     * Get all projects for the authenticated user
     */
    async getProjects(req, res) {
        const userId = req.user.id;
        const projects = await projectService.getProjects(userId);
        res.json(projects);
    }
    /**
     * GET /api/projects/:id
     * Get a single project by ID
     */
    async getProject(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        const project = await projectService.getProjectById(id, userId);
        res.json(project);
    }
    /**
     * PUT /api/projects/:id
     * Update a project
     */
    async updateProject(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        const project = await projectService.updateProject(id, req.body, userId);
        res.json({ message: 'Project updated successfully', project });
    }
    /**
     * DELETE /api/projects/:id
     * Delete a project
     */
    async deleteProject(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await projectService.deleteProject(id, userId);
        res.json(result);
    }
    /**
     * POST /api/projects/:id/members
     * Add a member to a project
     */
    async addMember(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        const { memberUserId, role } = req.body;
        if (!memberUserId) {
            return res.status(400).json({ error: 'Member user ID is required' });
        }
        const project = await projectService.addMember(id, userId, memberUserId, role);
        res.json({ message: 'Member added successfully', project });
    }
    /**
     * DELETE /api/projects/:id/members
     * Remove a member from a project
     */
    async removeMember(req, res) {
        const userId = req.user.id;
        const { id } = req.params;
        const { memberUserId } = req.body;
        if (!memberUserId) {
            return res.status(400).json({ error: 'Member user ID is required' });
        }
        const project = await projectService.removeMember(id, userId, memberUserId);
        res.json({ message: 'Member removed successfully', project });
    }
}
