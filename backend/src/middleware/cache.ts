import { Request, Response, NextFunction } from 'express';
import redisHelpers from '../config/redis.js';
import { trace } from '../utils/trace.js';

export const cache = (keyPrefix: string, ttlSeconds?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      trace('9-GET', 'cache skip — ye ' + req.method + ' hai, GET nahi');
      return next();
    }

    // ✅ Include user ID in cache key
    const userId = (req as any).user?.id || 'anonymous';
    const userRole = (req as any).user?.role || 'user';
    const cacheKey = `${keyPrefix}:user:${userId}:role:${userRole}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisHelpers.get(cacheKey);
      
      if (cachedData) {
        trace('9-GET', 'GUARD 3 🎯 CACHE HIT → Redis se jawab, DB tak jayenge hi nahi ⛔');
        return res.json(cachedData);
      }

      trace('9-GET', 'GUARD 3 ⭕ CACHE MISS → res.json ko hijack karke aage bhej raha hoon');

      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        trace('13b', 'hijacked res.json → pehle REDIS me save 💾, phir asli res.json');
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