// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import cookieParser from 'cookie-parser';

// Import middleware
import { logger } from './middleware/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import routes from './routes/index.js';

// Import config
import prisma from './config/prisma.js';

// 🎓 TRACE
import { trace, traceStart } from './utils/trace.js';



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
  
// 🎓 TRACE: sabse pehli line jo har request chhuti hai
app.use((req: Request, _res: Response, next: NextFunction) => {
  traceStart(req.method, req.originalUrl);
  next();
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  trace('1', 'express.json() → req.body =', req.body);
  next();
});

// Cookie parser
app.use(cookieParser()); // ✅ Add this line
app.use((req: Request, _res: Response, next: NextFunction) => {
  trace('2', 'cookieParser() → token cookie mila?', !!req.cookies?.token);
  next();
});

// Logging
app.use(logger);
app.use((_req: Request, _res: Response, next: NextFunction) => {
  trace('3', 'logger → timer START (iska apna log SABSE LAST me aayega)');
  next();
});

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    trace('4', 'CORS preflight → 200 bhej diya, YAHIN ROK DIYA ⛔');
    res.sendStatus(200);
    return;
  }
  trace('4', 'CORS headers lag gaye');
  next();
});




// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
  trace('5', "URL '/api' se shuru hota hai → andar bhejo");
  next();
});
app.use('/api', routes);

// ─────────────────────────────────────────────────────────────
// SWAGGER DOCUMENTATION
// ─────────────────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

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
