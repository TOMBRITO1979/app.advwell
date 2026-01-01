import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import whatsappConfigController from '../controllers/whatsapp-config.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e ADMIN
router.use(authenticate, companyRateLimit, validateTenant, requireAdmin);

// Validações para configuração WhatsApp
const whatsappConfigValidation = [
  body('phoneNumberId')
    .notEmpty()
    .isString()
    .withMessage('ID do número de telefone é obrigatório'),
  body('businessAccountId')
    .notEmpty()
    .isString()
    .withMessage('ID da conta Business é obrigatório'),
  body('accessToken')
    .notEmpty()
    .isString()
    .withMessage('Token de acesso é obrigatório'),
  body('webhookVerifyToken')
    .optional()
    .isString(),
];

// Routes - Configuração
router.get('/', whatsappConfigController.get);
router.post('/', whatsappConfigValidation, whatsappConfigController.createOrUpdate);
router.put('/', whatsappConfigValidation, whatsappConfigController.createOrUpdate);
router.post('/test', whatsappConfigController.test);
router.delete('/', whatsappConfigController.delete);
router.patch('/toggle', whatsappConfigController.toggleActive);

// Routes - Templates
router.get('/templates', whatsappConfigController.listTemplates);
router.post('/templates/sync', whatsappConfigController.syncTemplates);

export default router;
