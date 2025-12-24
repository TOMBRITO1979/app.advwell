import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { appLogger, securityLogger } from '../utils/logger';

/**
 * TAREFA 3.1: Classes de erro personalizadas
 */

// Erro base da aplicacao
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Erros especificos
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Limite de requisições excedido') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(`Erro no serviço externo: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Mapeia erros do Prisma para erros HTTP apropriados
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      // Violacao de unique constraint
      const target = (error.meta?.target as string[])?.join(', ') || 'campo';
      return new ConflictError(`Já existe um registro com este ${target}`);

    case 'P2003':
      // Violacao de foreign key
      return new ValidationError('Referência inválida para outro registro');

    case 'P2025':
      // Record not found
      return new NotFoundError('Registro');

    case 'P2014':
      // Required relation not found
      return new ValidationError('Relacionamento obrigatório não encontrado');

    default:
      return new AppError('Erro no banco de dados', 500, `PRISMA_${error.code}`);
  }
}

/**
 * Global Error Handler Middleware
 * Deve ser o ultimo middleware registrado
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Se ja respondeu, nao faz nada
  if (res.headersSent) {
    return;
  }

  // Tratar erros especificos
  let error: AppError;

  if (err instanceof AppError) {
    // Ja e um erro tratado
    error = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Erro do Prisma
    error = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Erro de validacao do Prisma
    error = new ValidationError('Dados inválidos para operação');
  } else if (err.name === 'JsonWebTokenError') {
    // Erro de JWT
    error = new UnauthorizedError('Token inválido');
  } else if (err.name === 'TokenExpiredError') {
    // Token expirado
    error = new UnauthorizedError('Token expirado');
  } else if ((err as any).type === 'entity.parse.failed') {
    // Erro de parse do body
    error = new ValidationError('JSON inválido no corpo da requisição');
  } else {
    // Erro desconhecido
    error = new AppError(
      config.nodeEnv === 'production'
        ? 'Erro interno do servidor'
        : err.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log estruturado
  const logData = {
    category: 'error',
    event: error.isOperational ? 'handled_error' : 'unhandled_error',
    correlationId: (req as any).correlationId,
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    errorCode: error.code,
    errorMessage: err.message,
    userId: (req as any).user?.userId,
    companyId: (req as any).user?.companyId,
  };

  // Logar stack trace apenas para erros nao operacionais ou em dev
  if (!error.isOperational || config.nodeEnv === 'development') {
    appLogger.error('Error occurred', err, logData);
  } else {
    appLogger.warn('Handled error', logData);
  }

  // Log de seguranca para erros de autorizacao
  if (error.statusCode === 401 || error.statusCode === 403) {
    securityLogger.warn('Access denied', {
      ...logData,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Resposta padronizada
  const response: Record<string, any> = {
    error: error.message,
    code: error.code,
    correlationId: (req as any).correlationId,
  };

  // Incluir stack apenas em desenvolvimento
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
    response.originalError = err.message !== error.message ? err.message : undefined;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Middleware para capturar erros de rotas nao encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
  });
};

/**
 * Wrapper para controllers async
 * Captura erros e passa para o error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
