import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { asyncHandler } from '../utils/helpers.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { cache } from '../middleware/cache.js';
const router = Router();
const projectController = new ProjectController();
// All project routes require authentication
router.use(authenticate);
router.post('/', asyncHandler(projectController.createProject));
// GET routes – cached
router.get('/', cache('project:list'), asyncHandler(projectController.getProjects));
router.get('/:id', cache('project:detail'), asyncHandler(projectController.getProject));
router.put('/:id', asyncHandler(projectController.updateProject));
router.delete('/:id', asyncHandler(projectController.deleteProject));
router.post('/:id/members', asyncHandler(projectController.addMember));
router.delete('/:id/members', asyncHandler(projectController.removeMember));
export default router;
