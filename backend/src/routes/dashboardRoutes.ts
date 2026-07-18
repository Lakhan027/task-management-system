// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getDashboardData, getHealthStats } from '../controllers/dashboardController.js';

import { asyncHandler } from '../utils/helpers.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/', asyncHandler(getDashboardData));
router.get('/health', asyncHandler(getHealthStats));

export default router;