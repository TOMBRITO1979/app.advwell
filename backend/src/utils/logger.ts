/**
 * Logger Estruturado com Winston
 *
 * Fornece logging estruturado com níveis apropriados para diferentes tipos de eventos.
 * Substitui console.log/error por um sistema de logging profissional.
 */

import winston from 'winston';

// Definir formato de log estruturado
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (mais legível)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'advwell-backend' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

/**
 * Métodos de logging por categoria
 */

export const securityLogger = {
  loginSuccess: (email: string, userId: string, ip?: string) => {
    logger.info('Login bem-sucedido', {
      category: 'security',
      event: 'login_success',
      email,
      userId,
      ip,
    });
  },

  loginFailed: (email: string, reason: string, ip?: string, attempt?: number) => {
    logger.warn('Tentativa de login falhada', {
      category: 'security',
      event: 'login_failed',
      email,
      reason,
      ip,
      attempt,
    });
  },

  accountLocked: (email: string, userId: string, unlockAt: Date, ip?: string) => {
    logger.warn('Conta bloqueada por múltiplas tentativas', {
      category: 'security',
      event: 'account_locked',
      email,
      userId,
      unlockAt: unlockAt.toISOString(),
      ip,
    });
  },

  passwordResetRequested: (email: string, ip?: string) => {
    logger.info('Solicitação de reset de senha', {
      category: 'security',
      event: 'password_reset_requested',
      email,
      ip,
    });
  },

  passwordResetCompleted: (email: string, userId: string, ip?: string) => {
    logger.info('Senha redefinida com sucesso', {
      category: 'security',
      event: 'password_reset_completed',
      email,
      userId,
      ip,
    });
  },

  rateLimitExceeded: (identifier: string, endpoint: string, ip?: string) => {
    logger.warn('Rate limit excedido', {
      category: 'security',
      event: 'rate_limit_exceeded',
      identifier,
      endpoint,
      ip,
    });
  },

  emailVerified: (email: string, userId: string) => {
    logger.info('Email verificado', {
      category: 'security',
      event: 'email_verified',
      email,
      userId,
    });
  },
};

export const appLogger = {
  error: (message: string, error?: Error, meta?: any) => {
    logger.error(message, {
      category: 'application',
      error: error?.message,
      stack: error?.stack,
      ...meta,
    });
  },

  warn: (message: string, meta?: any) => {
    logger.warn(message, {
      category: 'application',
      ...meta,
    });
  },

  info: (message: string, meta?: any) => {
    logger.info(message, {
      category: 'application',
      ...meta,
    });
  },

  debug: (message: string, meta?: any) => {
    logger.debug(message, {
      category: 'application',
      ...meta,
    });
  },
};

export default logger;
