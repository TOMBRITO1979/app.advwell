import Redis, { RedisOptions } from 'ioredis';

// SEGURANCA: Configuracao Redis com suporte a TLS e ACL
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  // SEGURANCA: Suporte a Redis ACL (Redis 6+)
  username: process.env.REDIS_USERNAME || undefined,
  // SEGURANCA: Suporte a TLS
  tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
  // Bull queue requirements
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // SEGURANCA: Timeout para conexao
  connectTimeout: 10000,
  // Reconexao automatica
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('Redis: Max retry attempts reached');
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
};

// Log configuracao (sem expor senha)
console.log(`Redis config: ${redisConfig.host}:${redisConfig.port} TLS=${!!redisConfig.tls} ACL=${!!redisConfig.username}`);

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
