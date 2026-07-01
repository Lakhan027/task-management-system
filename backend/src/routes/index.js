// src/routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
// import userRoutes from './userRoutes.js';
// import taskRoutes from './taskRoutes.js';

const router = express.Router();

// Health check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Task Management API is Running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/tasks', taskRoutes);

export default router;