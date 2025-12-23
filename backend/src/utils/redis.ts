import Redis, { RedisOptions } from 'ioredis';

// ALTA DISPONIBILIDADE: Redis Sentinel para failover automatico
// Build: v2 - Force rebuild with Sentinel support
const isSentinelMode = process.env.REDIS_SENTINEL_ENABLED === 'true';

// Configuracao comum para ambos os modos
const commonConfig: Partial<RedisOptions> = {
  password: process.env.REDIS_PASSWORD || undefined,
  // SEGURANCA: Suporte a Redis ACL (Redis 6+)
  username: process.env.REDIS_USERNAME || undefined,
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

// Parse sentinels string: "host1:port1,host2:port2,host3:port3"
const parseSentinels = (sentinelsStr: string) => {
  return sentinelsStr.split(',').map(s => {
    const [host, port] = s.trim().split(':');
    return { host, port: parseInt(port) || 26379 };
  });
};

// Configuracao baseada no modo
let redisConfig: RedisOptions;

if (isSentinelMode) {
  // ALTA DISPONIBILIDADE: Modo Sentinel para failover automatico
  const sentinelsStr = process.env.REDIS_SENTINELS || 'redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379';
  const masterName = process.env.REDIS_MASTER_NAME || 'mymaster';

  redisConfig = {
    ...commonConfig,
    sentinels: parseSentinels(sentinelsStr),
    name: masterName,
    // Senha dos Sentinels (pode ser diferente do Redis)
    sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    // SEGURANCA: Suporte a TLS nos Sentinels
    enableTLSForSentinelMode: process.env.REDIS_TLS_ENABLED === 'true',
    // Preferir replica para leituras (load balancing)
    preferredSlaves: process.env.REDIS_PREFER_REPLICA === 'true' ? [{ ip: '*', port: '*', prio: 1 }] : undefined,
    // Failover automatico
    failoverDetector: true,
  } as RedisOptions;

  console.log(`Redis Sentinel mode: master=${masterName} sentinels=${sentinelsStr}`);
} else {
  // Modo direto (atual)
  redisConfig = {
    ...commonConfig,
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // SEGURANCA: Suporte a TLS
    tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    } : undefined,
  };

  console.log(`Redis direct mode: ${redisConfig.host}:${redisConfig.port} TLS=${!!redisConfig.tls} ACL=${!!redisConfig.username}`);
}

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
