// src/utils/helpers.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

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
  Promise.resolve(fn(req, res, next)).catch(next);
};
