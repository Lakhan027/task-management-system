// src/routes/index.ts
import express, { Request, Response } from 'express';
import authRoutes from './authRoutes.js';

const router = express.Router();

// Health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Task Management API is Running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
router.use('/auth', authRoutes);

export default router;
