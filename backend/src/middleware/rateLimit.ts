import { Request, Response, NextFunction } from 'express';
import redisHelpers from '../config/redis.js';
import { trace } from '../utils/trace.js';

interface RateLimitConfig {
  windowSeconds: number;  // Time window in seconds
  maxRequests: number;    // Max requests per window
  message?: string;       // Custom error message
}

/**
 * Rate limiting middleware using Redis
 */
export const rateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get user ID or IP address
    const userId = (req as any).user?.id || req.ip;
    const key = `rate_limit:${userId}:${req.path}`;
    
    try {
      // Increment request count
      const count = await redisHelpers.increment(key, config.windowSeconds);
      
      // Check if limit exceeded
      trace('8', 'GUARD 2 → REDIS INCR ' + key + ' = ' + count + '/' + config.maxRequests);

      if (count > config.maxRequests) {
        trace('8', 'GUARD 2 ❌ limit paar → 429, ROK DIYA ⛔');
        return res.status(429).json({
          success: false,
          message: config.message || 'Too many requests, please try again later.',
          retryAfter: await redisHelpers.getTTL(key),
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(); // Continue on Redis error
    }
  };
};

/**
 * Default rate limit configs
 */
export const rateLimits = {
  strict: { windowSeconds: 60, maxRequests: 10 },
  moderate: { windowSeconds: 60, maxRequests: 30 },
  relaxed: { windowSeconds: 60, maxRequests: 100 },
};