// src/routes/authRoutes.ts
import express from 'express';
import { register, login } from '../controllers/authController.js';
const router = express.Router();
// Public routes - No authentication needed
router.post('/register', register);
router.post('/login', login);
export default router;
