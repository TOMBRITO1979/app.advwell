import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import clientSubscriptionController from '../controllers/client-subscription.controller';

const router = Router();

// All routes require authentication and ADMIN role
router.use(authenticate, validateTenant, requireAdmin);

// Validations
const createValidation = [
  body('clientId')
    .notEmpty()
    .isUUID()
    .withMessage('ID do cliente é obrigatório'),
  body('servicePlanId')
    .notEmpty()
    .isUUID()
    .withMessage('ID do plano de serviço é obrigatório'),
];

const cancelValidation = [
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Motivo do cancelamento deve ter no máximo 500 caracteres'),
];

// Routes
router.get('/', clientSubscriptionController.list);
router.get('/reports', clientSubscriptionController.getReports);
router.get('/:id', clientSubscriptionController.get);
router.get('/:id/payments', clientSubscriptionController.getPayments);
router.post('/', createValidation, clientSubscriptionController.create);
router.post('/:id/cancel', cancelValidation, clientSubscriptionController.cancel);
router.post('/:id/regenerate-checkout', clientSubscriptionController.regenerateCheckout);

export default router;
