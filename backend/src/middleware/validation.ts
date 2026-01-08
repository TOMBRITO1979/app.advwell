import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// SEGURANCA: Limites para paginacao (previne DoS via queries muito grandes)
const MAX_PAGE = 10000;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;
const MAX_SEARCH_LENGTH = 200;

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

/**
 * SEGURANCA: Middleware para validar e sanitizar query parameters de paginacao
 * Previne DoS via limit muito alto ou page muito grande
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  // Validar e sanitizar page
  let page = parseInt(req.query.page as string) || 1;
  if (page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;
  req.query.page = String(page);

  // Validar e sanitizar limit
  let limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
  if (limit < 1) limit = 1;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  req.query.limit = String(limit);

  // Validar e sanitizar search
  if (req.query.search) {
    let search = String(req.query.search).trim();
    if (search.length > MAX_SEARCH_LENGTH) {
      search = search.substring(0, MAX_SEARCH_LENGTH);
    }
    req.query.search = search;
  }

  next();
};
