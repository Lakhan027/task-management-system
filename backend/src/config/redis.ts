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

    // Parse the URL to extract host and token
    // For Upstash: rediss://default:TOKEN@HOST:6379
    const url = new URL(redisUrl);
    const password = url.password; // The token
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: true, // ✅ Enable TLS for Upstash
        rejectUnauthorized: false, // For development
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
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;
    try {
      const data = await redisClient!.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

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

  async delete(key: string): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      await redisClient!.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      const keys = await redisClient!.keys(pattern);
      if (keys.length > 0) {
        await redisClient!.del(keys);
      }
    } catch (error) {
      console.error('Redis deletePattern error:', error);
    }
  },

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

  async getTTL(key: string): Promise<number> {
    if (!isRedisConnected()) return -1;
    try {
      return await redisClient!.ttl(key);
    } catch (error) {
      return -1;
    }
  },

  async exists(key: string): Promise<boolean> {
    if (!isRedisConnected()) return false;
    try {
      return (await redisClient!.exists(key)) === 1;
    } catch (error) {
      return false;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    if (!isRedisConnected()) return [];
    try {
      return await redisClient!.keys(pattern);
    } catch (error) {
      return [];
    }
  },

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