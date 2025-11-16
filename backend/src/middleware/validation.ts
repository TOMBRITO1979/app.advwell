import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware para processar resultados de validação
 * Retorna 400 com detalhes dos erros se validação falhar
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
      })),
    });
  }

  next();
};

/**
 * Helper para criar uma cadeia de validações
 */
export const createValidationChain = (validations: ValidationChain[]) => {
  return [...validations, validate];
};
