import { Request, Response, NextFunction } from 'express';
import redisHelpers from '../config/redis.js';

export const cache = (keyPrefix: string, ttlSeconds?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    // ✅ Include user ID in cache key
    const userId = (req as any).user?.id || 'anonymous';
    const userRole = (req as any).user?.role || 'user';
    const cacheKey = `${keyPrefix}:user:${userId}:role:${userRole}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisHelpers.get(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache hit: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache miss: ${cacheKey}`);

      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        redisHelpers.set(cacheKey, data, ttlSeconds);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

export const clearCache = async (pattern: string): Promise<void> => {
  await redisHelpers.deletePattern(pattern);
};