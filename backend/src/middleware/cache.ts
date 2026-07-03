import { Request, Response, NextFunction } from 'express';
import redisHelpers from '../config/redis.js';

/**
 * Cache middleware – caches GET responses
 */
export const cache = (keyPrefix: string, ttlSeconds?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    try {
      // Check if data exists in cache
      const cachedData = await redisHelpers.get(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache hit: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache miss: ${cacheKey}`);

      // Store original send function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data: any) {
        // Cache the response
        redisHelpers.set(cacheKey, data, ttlSeconds);
        // Send the response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next(); // Continue without caching
    }
  };
};

/**
 * Clear cache for a specific key pattern
 */
export const clearCache = async (pattern: string): Promise<void> => {
  await redisHelpers.deletePattern(pattern);
};