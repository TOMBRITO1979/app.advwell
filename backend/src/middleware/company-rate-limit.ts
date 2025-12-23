import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { redis } from '../utils/redis';

// Configuracao de limites
const RATE_LIMIT_WINDOW = 60; // 1 minuto em segundos
const RATE_LIMIT_MAX_REQUESTS = 1000; // 1000 requisicoes por minuto por empresa
const SUPER_ADMIN_LIMIT = 5000; // SUPER_ADMIN tem limite maior

// Prefixo para chaves Redis
const RATE_LIMIT_PREFIX = 'ratelimit:company:';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number;
}

/**
 * Middleware de rate limiting por empresa
 * Limita requisicoes por companyId usando Redis
 * SUPER_ADMIN sem companyId usa userId como chave
 */
export const companyRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Se nao autenticado, passa adiante (sera bloqueado pelo auth middleware)
    if (!req.user) {
      return next();
    }

    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const limit = isSuperAdmin ? SUPER_ADMIN_LIMIT : RATE_LIMIT_MAX_REQUESTS;

    // Usar companyId como chave, ou userId para SUPER_ADMIN
    const identifier = req.user.companyId || `superadmin:${req.user.userId}`;
    const key = `${RATE_LIMIT_PREFIX}${identifier}`;

    // Obter contador atual
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Calcular tempo restante para reset
    const ttl = await redis.ttl(key);
    const reset = ttl > 0 ? Math.ceil(Date.now() / 1000) + ttl : Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW;

    // Verificar se excedeu limite
    if (count >= limit) {
      const rateLimitInfo: RateLimitInfo = {
        remaining: 0,
        limit,
        reset,
      };

      setRateLimitHeaders(res, rateLimitInfo);

      console.warn(`[RateLimit] Limite excedido para ${identifier}: ${count}/${limit} req/min`);

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW,
      });
    }

    // Incrementar contador
    const newCount = count + 1;

    if (count === 0) {
      // Primeira requisicao na janela - criar chave com TTL
      await redis.setex(key, RATE_LIMIT_WINDOW, '1');
    } else {
      // Incrementar sem alterar TTL
      await redis.incr(key);
    }

    // Adicionar headers de rate limit
    const rateLimitInfo: RateLimitInfo = {
      remaining: limit - newCount,
      limit,
      reset,
    };

    setRateLimitHeaders(res, rateLimitInfo);

    next();
  } catch (error) {
    // Em caso de erro no Redis, permite a requisicao (fail-open)
    console.error('[RateLimit] Erro ao verificar rate limit:', error);
    next();
  }
};

/**
 * Define headers HTTP padrao de rate limit
 */
function setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
  res.setHeader('X-RateLimit-Limit', info.limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
  res.setHeader('X-RateLimit-Reset', info.reset);
}

/**
 * Middleware mais restritivo para endpoints sensiveis
 * Ex: upload de arquivos, sincronizacao DataJud
 */
export const sensitiveRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const SENSITIVE_LIMIT = 100; // 100 req/min para endpoints sensiveis
    const identifier = req.user.companyId || `superadmin:${req.user.userId}`;
    const key = `${RATE_LIMIT_PREFIX}sensitive:${identifier}`;

    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const ttl = await redis.ttl(key);
    const reset = ttl > 0 ? Math.ceil(Date.now() / 1000) + ttl : Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW;

    if (count >= SENSITIVE_LIMIT) {
      setRateLimitHeaders(res, { remaining: 0, limit: SENSITIVE_LIMIT, reset });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Limite de requisições para esta operação excedido.',
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW,
      });
    }

    if (count === 0) {
      await redis.setex(key, RATE_LIMIT_WINDOW, '1');
    } else {
      await redis.incr(key);
    }

    setRateLimitHeaders(res, { remaining: SENSITIVE_LIMIT - (count + 1), limit: SENSITIVE_LIMIT, reset });

    next();
  } catch (error) {
    console.error('[RateLimit] Erro no sensitiveRateLimit:', error);
    next();
  }
};

/**
 * Rate limit muito restritivo para operacoes de backup
 * 5 operacoes por hora - operacoes criticas e pesadas
 */
export const backupRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const BACKUP_LIMIT = 5; // 5 operacoes por hora
    const BACKUP_WINDOW = 3600; // 1 hora em segundos
    const identifier = req.user.companyId || `superadmin:${req.user.userId}`;
    const key = `${RATE_LIMIT_PREFIX}backup:${identifier}`;

    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const ttl = await redis.ttl(key);
    const reset = ttl > 0 ? Math.ceil(Date.now() / 1000) + ttl : Math.ceil(Date.now() / 1000) + BACKUP_WINDOW;

    if (count >= BACKUP_LIMIT) {
      setRateLimitHeaders(res, { remaining: 0, limit: BACKUP_LIMIT, reset });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Limite de operações de backup excedido. Máximo de 5 operações por hora.',
        retryAfter: ttl > 0 ? ttl : BACKUP_WINDOW,
      });
    }

    if (count === 0) {
      await redis.setex(key, BACKUP_WINDOW, '1');
    } else {
      await redis.incr(key);
    }

    setRateLimitHeaders(res, { remaining: BACKUP_LIMIT - (count + 1), limit: BACKUP_LIMIT, reset });

    next();
  } catch (error) {
    console.error('[RateLimit] Erro no backupRateLimit:', error);
    next();
  }
};

export default companyRateLimit;
