// src/utils/helpers.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { trace } from './trace.js';

/**
 * Mask sensitive data in URL
 */
export const maskUrl = (url?: string): string => {
  if (!url) return '';
  return url.replace(/:[^:@]*@/, ':****@');
};

/**
 * Format timestamp
 */
export const formatTimestamp = (date: Date = new Date()): string => {
  return date.toISOString();
};

/**
 * Get environment
 */
export const getEnv = (): string => process.env.NODE_ENV || 'development';

/**
 * Check if development environment
 */
export const isDev = (): boolean => getEnv() === 'development';

/**
 * Check if production environment
 */
export const isProd = (): boolean => getEnv() === 'production';

/**
 * Get server port
 */
export const getPort = (): string | number => process.env.PORT || 5000;

/**
 * Async wrapper for route handlers
 */
export const asyncHandler = (fn: Function): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  trace('10', 'asyncHandler → controller ko bula raha hoon (error aaya to pakad lunga)');
  Promise.resolve(fn(req, res, next)).catch((err) => {
    trace('10', '💥 controller ne error phenka → errorHandler ko bhej raha hoon');
    next(err);
  });
};
