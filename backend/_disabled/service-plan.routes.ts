import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import servicePlanController from '../controllers/service-plan.controller';

const router = Router();

// All routes require authentication and ADMIN role
router.use(authenticate, validateTenant, requireAdmin);

// Validations
const planValidation = [
  body('name')
    .notEmpty()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('price')
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage('Preço deve ser maior que zero'),
  body('interval')
    .optional()
    .isIn(['MONTHLY', 'QUARTERLY', 'YEARLY'])
    .withMessage('Intervalo deve ser MONTHLY, QUARTERLY ou YEARLY'),
];

const updateValidation = [
  body('name')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Preço deve ser maior que zero'),
  body('interval')
    .optional()
    .isIn(['MONTHLY', 'QUARTERLY', 'YEARLY'])
    .withMessage('Intervalo deve ser MONTHLY, QUARTERLY ou YEARLY'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false'),
];

// Routes
router.get('/', servicePlanController.list);
router.get('/:id', servicePlanController.get);
router.post('/', planValidation, servicePlanController.create);
router.put('/:id', updateValidation, servicePlanController.update);
router.delete('/:id', servicePlanController.delete);
router.post('/:id/sync', servicePlanController.syncWithStripe);

export default router;
