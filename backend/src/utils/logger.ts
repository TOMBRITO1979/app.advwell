/**
 * Logger Estruturado com Winston
 *
 * Fornece logging estruturado com níveis apropriados para diferentes tipos de eventos.
 * Substitui console.log/error por um sistema de logging profissional.
 *
 * SEGURANCA: Inclui sanitizacao automatica de campos sensiveis
 */

import winston from 'winston';

// SEGURANCA: Lista de campos que devem ser censurados nos logs
const SENSITIVE_KEYS = [
  'password', 'senha', 'secret', 'token', 'apiKey', 'api_key',
  'authorization', 'auth', 'credential', 'private_key', 'privateKey',
  'accessToken', 'refreshToken', 'resetToken', 'emailVerificationToken',
  'smtp_password', 'smtpPassword', 'encryption_key', 'encryptionKey',
  'jwt_secret', 'jwtSecret', 'database_url', 'databaseUrl',
];

// SEGURANCA: Sanitiza objetos removendo valores de campos sensiveis
function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Error) {
    return {
      message: data.message,
      name: data.name,
      stack: data.stack,
    };
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// SEGURANCA: Formato customizado que sanitiza dados antes de logar
const sanitizeFormat = winston.format((info) => {
  // Sanitiza todos os campos exceto level, message, timestamp
  const sanitized = { ...info };
  for (const key of Object.keys(sanitized)) {
    if (!['level', 'message', 'timestamp', 'service'].includes(key)) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  return sanitized;
});

// Definir formato de log estruturado
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  sanitizeFormat(), // SEGURANCA: Aplica sanitizacao
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

  // SEGURANCA: Novos eventos adicionados para auditoria completa
  embedAuthAttempt: (companyId: string, ip?: string, userAgent?: string, success?: boolean) => {
    const level = success ? 'info' : 'warn';
    logger[level]('Tentativa de embed auth', {
      category: 'security',
      event: 'embed_auth_attempt',
      companyId,
      ip,
      userAgent,
      success,
    });
  },

  apiKeyUsed: (apiKey: string, companyId: string, endpoint: string, ip?: string) => {
    logger.info('API key utilizada', {
      category: 'security',
      event: 'api_key_used',
      apiKeyPrefix: apiKey.substring(0, 8) + '...', // Nao loga chave completa
      companyId,
      endpoint,
      ip,
    });
  },

  suspiciousActivity: (description: string, userId?: string, ip?: string, meta?: any) => {
    logger.warn('Atividade suspeita detectada', {
      category: 'security',
      event: 'suspicious_activity',
      description,
      userId,
      ip,
      ...meta,
    });
  },

  unauthorizedAccess: (resource: string, userId: string, companyId?: string, ip?: string) => {
    logger.warn('Tentativa de acesso nao autorizado', {
      category: 'security',
      event: 'unauthorized_access',
      resource,
      userId,
      companyId,
      ip,
    });
  },

  dataExport: (entityType: string, count: number, userId: string, companyId: string) => {
    logger.info('Exportacao de dados', {
      category: 'security',
      event: 'data_export',
      entityType,
      count,
      userId,
      companyId,
    });
  },

  configurationChange: (setting: string, userId: string, companyId: string, oldValue?: string, newValue?: string) => {
    logger.info('Configuracao alterada', {
      category: 'security',
      event: 'configuration_change',
      setting,
      userId,
      companyId,
      oldValue: oldValue ? '[REDACTED]' : undefined,
      newValue: newValue ? '[REDACTED]' : undefined,
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
