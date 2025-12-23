import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import campaignController from '../controllers/campaign.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e ADMIN
router.use(authenticate, companyRateLimit, validateTenant, requireAdmin);

// Validações
const campaignValidation = [
  body('name').notEmpty().isString().withMessage('Nome da campanha é obrigatório'),
  body('subject').notEmpty().isString().withMessage('Assunto é obrigatório'),
  body('body').notEmpty().isString().withMessage('Corpo do email é obrigatório'),
  body('recipients').isArray({ min: 1, max: 500 }).withMessage('Adicione entre 1 e 500 destinatários'),
];

// Routes
router.get('/templates', campaignController.getTemplates); // Must be before /:id
router.get('/templates/:id', campaignController.getTemplate);
router.get('/', campaignController.list);
router.get('/:id', campaignController.get);
router.post('/', campaignValidation, campaignController.create);
router.delete('/:id', campaignController.delete);
router.post('/:id/send', campaignController.send);

export default router;
