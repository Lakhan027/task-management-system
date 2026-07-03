import { Router } from 'express';
import authRoutes from './authRoutes.js';
import taskRoutes from './taskRoutes.js';
import projectRoutes from './projectRoutes.js';
const router = Router();
// Health check
router.get('/', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            auth: '/api/auth',
            tasks: '/api/tasks',
            projects: '/api/projects',
            docs: '/api-docs',
        },
    });
});
// API routes
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/projects', projectRoutes);
export default router;
