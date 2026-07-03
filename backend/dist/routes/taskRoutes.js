import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { asyncHandler } from '../utils/helpers.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const taskController = new TaskController();
// All task routes require authentication
router.use(authenticate);
router.post('/', asyncHandler(taskController.createTask));
router.get('/', asyncHandler(taskController.getTasks));
router.get('/stats', asyncHandler(taskController.getStats));
router.get('/:id', asyncHandler(taskController.getTask));
router.put('/:id', asyncHandler(taskController.updateTask));
router.patch('/:id/status', asyncHandler(taskController.updateStatus));
router.delete('/:id', asyncHandler(taskController.deleteTask));
router.post('/:id/comments', asyncHandler(taskController.addComment));
export default router;
