import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { redis } from '../utils/redis';
import { appLogger } from '../utils/logger';

// Configuracao de limites
const RATE_LIMIT_WINDOW = 60; // 1 minuto em segundos
const RATE_LIMIT_MAX_REQUESTS = 1000; // 1000 requisicoes por minuto por empresa
const SUPER_ADMIN_LIMIT = 5000; // SUPER_ADMIN tem limite maior

// Prefixo para chaves Redis
const RATE_LIMIT_PREFIX = 'ratelimit:company:';

// AUDITORIA: Circuit breaker para fail-closed após erros consecutivos
const MAX_CONSECUTIVE_ERRORS = 3; // Após 3 erros, bloqueia
const CIRCUIT_RESET_TIME = 30000; // 30 segundos para tentar novamente
let consecutiveErrors = 0;
let circuitOpen = false;
let circuitOpenTime = 0;

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

      appLogger.warn('Rate limit exceeded', { identifier, count, limit });

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

    // AUDITORIA: Reset do circuit breaker em caso de sucesso
    if (consecutiveErrors > 0) {
      consecutiveErrors = 0;
      if (circuitOpen) {
        circuitOpen = false;
        appLogger.info('[RateLimit] Circuit breaker fechado - Redis operacional');
      }
    }

    next();
  } catch (error) {
    // AUDITORIA: Circuit breaker - fail-closed após erros consecutivos
    consecutiveErrors++;
    appLogger.error('[RateLimit] Erro ao verificar rate limit', error as Error, {
      consecutiveErrors,
      circuitOpen,
    });

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      if (!circuitOpen) {
        circuitOpen = true;
        circuitOpenTime = Date.now();
        appLogger.warn('[RateLimit] Circuit breaker ABERTO - bloqueando requisições', {
          consecutiveErrors,
          resetIn: CIRCUIT_RESET_TIME / 1000,
        });
      }
    }

    // Se circuito aberto, verifica se pode tentar novamente
    if (circuitOpen) {
      const elapsed = Date.now() - circuitOpenTime;
      if (elapsed > CIRCUIT_RESET_TIME) {
        // Tenta fechar o circuito
        circuitOpen = false;
        consecutiveErrors = 0;
        appLogger.info('[RateLimit] Circuit breaker fechado - tentando novamente');
        // Permite esta requisição para testar
        return next();
      }

      // Circuito ainda aberto - bloqueia
      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Sistema de controle de taxa temporariamente indisponível. Tente novamente em alguns segundos.',
        retryAfter: Math.ceil((CIRCUIT_RESET_TIME - elapsed) / 1000),
      });
    }

    // Ainda não atingiu o limite de erros - permite (fail-open limitado)
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
    appLogger.error('Erro no sensitiveRateLimit', error as Error);
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
    appLogger.error('Erro no backupRateLimit', error as Error);
    next();
  }
};

/**
 * Rate limit muito restritivo para imports de CSV
 * 3 operações por 5 minutos por empresa
 * Protege contra abuse e ataques de sobrecarga
 */
export const csvImportRateLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const CSV_LIMIT = 3; // 3 imports por janela
    const CSV_WINDOW = 300; // 5 minutos em segundos
    const identifier = req.user.companyId || `superadmin:${req.user.userId}`;
    const key = `${RATE_LIMIT_PREFIX}csv-import:${identifier}`;

    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const ttl = await redis.ttl(key);
    const reset = ttl > 0 ? Math.ceil(Date.now() / 1000) + ttl : Math.ceil(Date.now() / 1000) + CSV_WINDOW;

    if (count >= CSV_LIMIT) {
      setRateLimitHeaders(res, { remaining: 0, limit: CSV_LIMIT, reset });

      const minutesRemaining = Math.ceil((ttl > 0 ? ttl : CSV_WINDOW) / 60);

      return res.status(429).json({
        error: 'Limite de importações atingido',
        message: `Você pode fazer no máximo ${CSV_LIMIT} importações de CSV a cada 5 minutos. Tente novamente em ${minutesRemaining} minuto(s).`,
        retryAfter: ttl > 0 ? ttl : CSV_WINDOW,
      });
    }

    if (count === 0) {
      await redis.setex(key, CSV_WINDOW, '1');
    } else {
      await redis.incr(key);
    }

    setRateLimitHeaders(res, { remaining: CSV_LIMIT - (count + 1), limit: CSV_LIMIT, reset });

    next();
  } catch (error) {
    appLogger.error('Erro no csvImportRateLimit', error as Error);
    // Em caso de erro do Redis, permite (fail-open) mas loga
    next();
  }
};

export default companyRateLimit;
