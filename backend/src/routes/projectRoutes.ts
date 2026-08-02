import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';

import { asyncHandler } from '../utils/helpers.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { cache } from '../middleware/cache.js';
import { rateLimit, rateLimits } from '../middleware/rateLimit.js';

const router = Router();
const projectController = new ProjectController();

// All project routes require authentication
router.use(authenticate);

router.post('/', rateLimit(rateLimits.strict), asyncHandler(projectController.createProject));


// GET routes – cached
router.get('/', rateLimit(rateLimits.relaxed), cache('project:list'), asyncHandler(projectController.getProjects));
router.get('/:id', rateLimit(rateLimits.relaxed), cache('project:detail'), asyncHandler(projectController.getProject));



router.put('/:id', rateLimit(rateLimits.strict), asyncHandler(projectController.updateProject));
router.delete('/:id', rateLimit(rateLimits.strict), asyncHandler(projectController.deleteProject));
router.post('/:id/members', rateLimit(rateLimits.strict), asyncHandler(projectController.addMember));
router.delete('/:id/members', rateLimit(rateLimits.strict), asyncHandler(projectController.removeMember));

export default router;
