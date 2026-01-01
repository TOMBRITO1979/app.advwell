import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import googleCalendarConfigController from '../controllers/google-calendar-config.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e ADMIN
router.use(authenticate, companyRateLimit, validateTenant, requireAdmin);

// Validações
const configValidation = [
  body('clientId').notEmpty().isString().withMessage('Client ID é obrigatório'),
  body('clientSecret').optional().isString(),
  body('redirectUri').optional().isString(),
  body('isActive').optional().isBoolean(),
];

// Routes
router.get('/', googleCalendarConfigController.get.bind(googleCalendarConfigController));
router.post('/', configValidation, googleCalendarConfigController.save.bind(googleCalendarConfigController));
router.put('/', configValidation, googleCalendarConfigController.save.bind(googleCalendarConfigController));
router.post('/test', googleCalendarConfigController.test.bind(googleCalendarConfigController));
router.delete('/', googleCalendarConfigController.delete.bind(googleCalendarConfigController));

export default router;
