import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { asyncHandler } from '../utils/helpers.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { cache } from '../middleware/cache.js';
import { rateLimit, rateLimits } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { trace } from '../utils/trace.js';
import { validateTaskComment, validateTaskCreate, validateTaskStatus, validateTaskUpdate } from '../utils/validators.js';

const router = Router();
const taskController = new TaskController();

// 🎓 TRACE
router.use((req, _res, next) => {
  trace('6', 'taskRoutes ke andar → ' + req.method + ' ' + req.path);
  next();
});

// All task routes require authentication
router.use(authenticate);

// POST routes – no cache (mutations)
router.post('/', rateLimit(rateLimits.strict), validateBody(validateTaskCreate), asyncHandler(taskController.createTask));

// GET routes – cached
router.get('/',  rateLimit(rateLimits.relaxed), cache('tasks:list'), asyncHandler(taskController.getTasks));
router.get('/stats', rateLimit(rateLimits.relaxed), cache('tasks:stats'), asyncHandler(taskController.getStats));
router.get('/:id', rateLimit(rateLimits.relaxed), cache('tasks:detail'), asyncHandler(taskController.getTask));

// PUT/PATCH/DELETE – no cache (mutations)
router.put('/:id', rateLimit(rateLimits.strict), validateBody(validateTaskUpdate), asyncHandler(taskController.updateTask));
router.patch('/:id/status', rateLimit(rateLimits.strict), validateBody(validateTaskStatus), asyncHandler(taskController.updateStatus));
router.delete('/:id', rateLimit(rateLimits.strict), asyncHandler(taskController.deleteTask));
router.post('/:id/comments', rateLimit(rateLimits.strict), validateBody(validateTaskComment), asyncHandler(taskController.addComment));

export default router;
