import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

/**
 * Connect to Redis (Upstash)
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('⚠️ REDIS_URL not set. Continuing without Redis.');
      return;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: true,
        rejectUnauthorized: false,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('⚠️ Redis: Max reconnection attempts reached.');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready to use');
    });

    redisClient.on('end', () => {
      console.log('📴 Redis connection ended');
    });

    await redisClient.connect();
    
  } catch (error: any) {
    console.error('❌ Redis connection failed:', error.message);
    console.warn('⚠️ Redis: Continuing without Redis. Caching disabled.');
  }
};

/**
 * Disconnect from Redis
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Redis:', error);
    }
  }
};

/**
 * Get Redis client
 */
export const getRedis = (): RedisClientType | null => {
  return redisClient;
};

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  return redisClient !== null && redisClient.isReady;
};

/**
 * Redis helpers (with fallback)
 */
export const redisHelpers = {
  /**
   * Get cached data with type checking
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;
    try {
      const type = await redisClient!.type(key);
      
      if (type === 'string') {
        const data = await redisClient!.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      }
      
      // If it's a different type, delete it
      if (type !== 'none') {
        console.warn(`⚠️ Key "${key}" is type "${type}", not string. Deleting...`);
        await redisClient!.del(key);
      }
      
      return null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Set cached data with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const ttl = ttlSeconds || parseInt(process.env.REDIS_CACHE_TTL || '3600');
      await redisClient!.setEx(key, ttl, stringValue);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  /**
   * Delete a single key
   */
  async delete(key: string): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      await redisClient!.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  /**
   * Delete all keys matching a pattern using SCAN
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      let cursor = 0;
      const keysToDelete: string[] = [];
      
      do {
        const result = await redisClient!.scan(String(cursor), { MATCH: pattern, COUNT: 100 });
        cursor = Number(result.cursor);
        keysToDelete.push(...result.keys);
      } while (cursor !== 0);
      
      if (keysToDelete.length > 0) {
        await redisClient!.del(keysToDelete);
      }
    } catch (error) {
      console.error('Redis deletePattern error:', error);
    }
  },

  /**
   * Increment a counter (for rate limiting)
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!isRedisConnected()) return 0;
    try {
      const count = await redisClient!.incr(key);
      if (ttlSeconds && count === 1) {
        await redisClient!.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  },

  /**
   * Get remaining TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    if (!isRedisConnected()) return -1;
    try {
      return await redisClient!.ttl(key);
    } catch (error) {
      return -1;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!isRedisConnected()) return false;
    try {
      return (await redisClient!.exists(key)) === 1;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get all keys matching a pattern using SCAN
   */
  async keys(pattern: string): Promise<string[]> {
    if (!isRedisConnected()) return [];
    try {
      let cursor = 0;
      const allKeys: string[] = [];
      
      do {
        const result = await redisClient!.scan(String(cursor), { MATCH: pattern, COUNT: 100 });
        cursor = Number(result.cursor);
        allKeys.push(...result.keys);
      } while (cursor !== 0);
      
      return allKeys;
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  },

  /**
   * Get the type of a Redis key
   */
  async getType(key: string): Promise<string | null> {
    if (!isRedisConnected()) return null;
    try {
      return await redisClient!.type(key);
    } catch (error) {
      console.error('Redis getType error:', error);
      return null;
    }
  },

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return isRedisConnected();
  },

  /**
   * Flush all Redis data (use with caution!)
   */
  async flushAll(): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      await redisClient!.flushAll();
    } catch (error) {
      console.error('Redis flushAll error:', error);
    }
  },
};

export default redisHelpers;