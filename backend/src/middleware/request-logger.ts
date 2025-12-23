/**
 * Request Logger Middleware
 *
 * Adiciona correlation ID a cada request e loga requests/responses HTTP.
 * Permite rastrear uma requisição através de todos os logs do sistema.
 *
 * SEGURANCA: Não loga bodies de requests que podem conter dados sensíveis
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

// Extender Express Request para incluir correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

// Header para correlation ID (padrão da indústria)
const CORRELATION_ID_HEADER = 'x-correlation-id';

// Endpoints que não devem ser logados (muito frequentes)
const SKIP_LOGGING_PATHS = [
  '/health',
  '/health/detailed',
  '/favicon.ico',
];

// Paths sensíveis que não devem ter query params logados
const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/forgot-password',
];

/**
 * Middleware que adiciona correlation ID a cada request
 * Se o cliente enviar um correlation ID no header, ele é reutilizado
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Usar correlation ID do header ou gerar um novo
  const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();

  // Anexar ao request
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Adicionar ao response header para rastreabilidade
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
};

/**
 * Middleware que loga requests HTTP
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip paths que não precisam de logging
  if (SKIP_LOGGING_PATHS.some(path => req.path === path || req.path.startsWith(path))) {
    return next();
  }

  // Capturar informações do request
  const requestInfo = {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    // Não logar query params em paths sensíveis
    query: SENSITIVE_PATHS.some(p => req.path.startsWith(p)) ? '[REDACTED]' : req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']?.substring(0, 100), // Truncar user-agent longo
    userId: (req as any).user?.userId,
    companyId: (req as any).user?.companyId,
  };

  // Log de início do request (nível debug para não poluir)
  logger.debug('Request recebido', {
    category: 'http',
    event: 'request_start',
    ...requestInfo,
  });

  // Interceptar o response para logar a resposta
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    // Determinar nível de log baseado no status code
    const logLevel = statusCode >= 500 ? 'error' :
                     statusCode >= 400 ? 'warn' :
                     'info';

    // Log estruturado do response
    logger.log(logLevel, 'Request finalizado', {
      category: 'http',
      event: 'request_end',
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode,
      responseTime: `${responseTime}ms`,
      userId: (req as any).user?.userId,
      companyId: (req as any).user?.companyId,
      // Não logar body de response para evitar dados sensíveis
      contentLength: res.getHeader('content-length'),
    });

    // Alertar sobre requests lentos (> 5s)
    if (responseTime > 5000) {
      logger.warn('Request lento detectado', {
        category: 'performance',
        event: 'slow_request',
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        userId: (req as any).user?.userId,
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Helper para obter correlation ID do request atual
 * Útil para passar em chamadas de serviços
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};

/**
 * Criar child logger com correlation ID
 * Útil para logar dentro de serviços mantendo o contexto
 */
export const createRequestLogger = (req: Request) => {
  const correlationId = req.correlationId;

  return {
    info: (message: string, meta?: any) => {
      logger.info(message, { correlationId, ...meta });
    },
    warn: (message: string, meta?: any) => {
      logger.warn(message, { correlationId, ...meta });
    },
    error: (message: string, error?: Error, meta?: any) => {
      logger.error(message, {
        correlationId,
        error: error?.message,
        stack: error?.stack,
        ...meta
      });
    },
    debug: (message: string, meta?: any) => {
      logger.debug(message, { correlationId, ...meta });
    },
  };
};

export default {
  correlationIdMiddleware,
  requestLoggerMiddleware,
  getCorrelationId,
  createRequestLogger,
};
