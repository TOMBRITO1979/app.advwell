import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 100,
  retryDelayOnTryAgain: 100,
};

// Create Redis client for general caching
export const redis = new Redis(redisConfig);

// Create subscriber client for Bull
export const createRedisClient = () => new Redis(redisConfig);

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      // Usar SCAN em vez de KEYS para não bloquear o Redis
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error('Redis DEL pattern error:', error);
    }
  },
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Closing Redis connection...');
  await redis.quit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default redis;
