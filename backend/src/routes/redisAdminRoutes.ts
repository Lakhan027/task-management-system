import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/helpers.js';
import { getRedis, redisHelpers } from '../config/redis.js';

const router = Router();

// All admin redis routes are protected: authenticated + admin role
router.use(authenticate, authorize(['admin']));

/**
 * GET /api/admin/redis/keys?pattern=...&limit=100
 * Returns list of keys (limited) with type and ttl. Max limit enforced to protect browser.
 */
router.get(
  '/keys',
  asyncHandler(async (req: Request, res: Response) => {
    const pattern = String(req.query.pattern || '*');

    // Pagination parameters: cursor (string) and count (how many keys to scan per call)
    const cursor = String(req.query.cursor || '0');
    let count = Number(req.query.count || 50);
    if (!isFinite(count) || count <= 0) count = 50;
    const MAX_COUNT = 200;
    if (count > MAX_COUNT) count = MAX_COUNT;

    const client = getRedis();
    if (!client) {
      res.status(503).json({ success: false, message: 'Redis not connected' });
      return;
    }

    try {
      // Use SCAN with the provided cursor and count. The result contains { cursor, keys }
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: count });
      const nextCursor = result.cursor;
      const keys = result.keys || [];

      // Resolve type and ttl for these keys
      const samples = await Promise.all(
        keys.map(async (key) => {
          const type = (await redisHelpers.getType(key)) || 'unknown';
          const ttl = await redisHelpers.getTTL(key);
          return { key, type, ttl };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          cursor: String(nextCursor),
          finished: String(nextCursor) === '0',
          count: samples.length,
          samples,
        },
      });
    } catch (error: any) {
      console.error('Error scanning redis keys:', error);
      res.status(500).json({ success: false, message: 'Failed to scan keys' });
    }
  })
);

/**
 * GET /api/admin/redis/value?key=...&limit=100
 * Returns the value for the key with its type and TTL. Array-like results are capped by limit.
 */
router.get(
  '/value',
  asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.query.key || '');
    if (!key) {
      res.status(400).json({ success: false, message: 'Missing key query parameter' });
      return;
    }

    let limit = Number(req.query.limit || 100);
    if (!isFinite(limit) || limit <= 0) limit = 100;
    const MAX_LIMIT = 1000;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const client = getRedis();
    if (!client) {
      res.status(503).json({ success: false, message: 'Redis not connected' });
      return;
    }

    const exists = await redisHelpers.exists(key);
    if (!exists) {
      res.status(404).json({ success: false, message: 'Key not found' });
      return;
    }

    const type = (await redisHelpers.getType(key)) || 'unknown';
    const ttl = await redisHelpers.getTTL(key);

    try {
      let value: any = null;

      switch (type) {
        case 'string': {
          value = await client.get(key);
          // Try JSON-parse if looks like JSON
          try {
            value = JSON.parse(value as string);
          } catch (e) {
            // leave as string
          }
          break;
        }

        case 'hash': {
          value = await client.hGetAll(key);
          break;
        }

        case 'list': {
          value = await client.lRange(key, 0, Math.max(0, limit - 1));
          break;
        }

        case 'set': {
          value = await client.sMembers(key);
          if (Array.isArray(value) && value.length > limit) value = value.slice(0, limit);
          break;
        }

        case 'zset': {
          // Prefer zRangeWithScores if available, fall back to zRange
          if (typeof (client as any).zRangeWithScores === 'function') {
            value = await (client as any).zRangeWithScores(key, 0, Math.max(0, limit - 1));
          } else {
            // returns members only
            value = await client.zRange(key, 0, Math.max(0, limit - 1));
          }
          break;
        }

        default: {
          // For unknown / other types, try to get as string
          try {
            value = await client.get(key);
            try { value = JSON.parse(value as string); } catch {};
          } catch (e) {
            value = null;
          }
        }
      }

      res.status(200).json({ success: true, data: { key, type, ttl, value } });
    } catch (error: any) {
      console.error('Error fetching redis value:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch key value' });
    }
  })
);

/**
 * DELETE /api/admin/redis/key?key=...
 * Delete a key (admin only). Returns deleted count (0/1).
 */
router.delete(
  '/key',
  asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.query.key || '');
    if (!key) {
      res.status(400).json({ success: false, message: 'Missing key query parameter' });
      return;
    }

    const client = getRedis();
    if (!client) {
      res.status(503).json({ success: false, message: 'Redis not connected' });
      return;
    }

    try {
      const deleted = await client.del(key);
      res.status(200).json({ success: true, data: { key, deleted } });
    } catch (error: any) {
      console.error('Error deleting redis key:', error);
      res.status(500).json({ success: false, message: 'Failed to delete key' });
    }
  })
);

export default router;
