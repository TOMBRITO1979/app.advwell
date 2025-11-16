import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import accountsPayableController from '../controllers/accounts-payable.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// Middleware de validação genérico
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Validações para criação
const createValidation = [
  body('supplier')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Fornecedor deve ter entre 2 e 200 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Descrição deve ter entre 2 e 500 caracteres'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('dueDate')
    .isISO8601()
    .withMessage('Data de vencimento inválida'),
  body('category')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Categoria deve ter no máximo 100 caracteres'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validações para atualização
const updateValidation = [
  body('supplier')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Fornecedor deve ter entre 2 e 200 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Descrição deve ter entre 2 e 500 caracteres'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento inválida'),
  body('paidDate')
    .optional()
    .isISO8601()
    .withMessage('Data de pagamento inválida'),
  body('status')
    .optional()
    .isIn(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'])
    .withMessage('Status inválido'),
  body('category')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Categoria deve ter no máximo 100 caracteres'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

router.post('/', createValidation, validate, accountsPayableController.create);
router.get('/', accountsPayableController.list);
router.get('/:id', accountsPayableController.get);
router.put('/:id', updateValidation, validate, accountsPayableController.update);
router.delete('/:id', accountsPayableController.delete);
router.post('/:id/pay', accountsPayableController.markAsPaid);

export default router;
