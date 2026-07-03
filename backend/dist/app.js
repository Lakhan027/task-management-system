// src/app.ts
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
// Import middleware
import { logger } from './middleware/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
// Import routes
import routes from './routes/index.js';
// Import config
import prisma from './config/prisma.js';
// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
// Create Express app
const app = express();
// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────
// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Logging
app.use(logger);
// CORS
app.use((req, res, next) => {
    const allowedOrigin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
// ─────────────────────────────────────────────────────────────
// DATABASE CONNECTIONS (Connect both databases)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
app.use('/api', routes);
// ─────────────────────────────────────────────────────────────
// SWAGGER DOCUMENTATION
// ─────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
export default app;
export { prisma };
