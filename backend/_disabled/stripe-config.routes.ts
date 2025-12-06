import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import stripeConfigController from '../controllers/stripe-config.controller';

const router = Router();

// All routes require authentication and ADMIN role
router.use(authenticate, validateTenant, requireAdmin);

// Validations
const stripeConfigValidation = [
  body('stripePublicKey')
    .notEmpty()
    .isString()
    .matches(/^pk_/)
    .withMessage('Chave pública deve começar com "pk_"'),
  body('stripeSecretKey')
    .notEmpty()
    .isString()
    .matches(/^sk_/)
    .withMessage('Chave secreta deve começar com "sk_"'),
  body('stripeWebhookSecret')
    .optional()
    .isString()
    .matches(/^whsec_/)
    .withMessage('Webhook secret deve começar com "whsec_"'),
];

// Routes
router.get('/', stripeConfigController.get);
router.post('/', stripeConfigValidation, stripeConfigController.createOrUpdate);
router.put('/', stripeConfigValidation, stripeConfigController.createOrUpdate);
router.post('/test', stripeConfigController.test);
router.delete('/', stripeConfigController.delete);

export default router;
