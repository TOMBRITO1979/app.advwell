import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import whatsappCampaignController from '../controllers/whatsapp-campaign.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e ADMIN
router.use(authenticate, companyRateLimit, validateTenant, requireAdmin);

// ============================================================================
// VALIDAÇÕES
// ============================================================================

const createCampaignValidation = [
  body('name')
    .notEmpty()
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  body('templateId')
    .notEmpty()
    .isUUID()
    .withMessage('ID do template é obrigatório'),
  body('recipients')
    .isArray({ min: 1, max: 500 })
    .withMessage('Adicione entre 1 e 500 destinatários'),
  body('recipients.*.phone')
    .notEmpty()
    .isString()
    .withMessage('Telefone é obrigatório para cada destinatário'),
  body('recipients.*.name')
    .optional()
    .isString(),
  body('recipients.*.variables')
    .optional()
    .isObject(),
];

const updateCampaignValidation = [
  body('name')
    .optional()
    .isString()
    .isLength({ min: 3, max: 100 }),
  body('templateId')
    .optional()
    .isUUID(),
  body('recipients')
    .optional()
    .isArray({ max: 500 }),
];

const sendTestValidation = [
  body('phone')
    .notEmpty()
    .isString()
    .withMessage('Telefone é obrigatório'),
  body('templateName')
    .notEmpty()
    .isString()
    .withMessage('Nome do template é obrigatório'),
  body('variables')
    .optional()
    .isObject(),
];

const importClientsValidation = [
  body('filter')
    .optional()
    .isObject(),
  body('filter.tag')
    .optional()
    .isString(),
  body('filter.city')
    .optional()
    .isString(),
  body('filter.state')
    .optional()
    .isString(),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 500 }),
];

const listQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
  query('status')
    .optional()
    .isIn(['draft', 'sending', 'completed', 'failed', 'cancelled']),
];

// ============================================================================
// ROTAS DE CAMPANHAS
// ============================================================================

// Listar campanhas
router.get('/', listQueryValidation, whatsappCampaignController.list);

// Estatísticas gerais da empresa
router.get('/stats', whatsappCampaignController.companyStats);

// Importar clientes para campanha
router.post('/import-clients', importClientsValidation, whatsappCampaignController.importFromClients);

// Enviar mensagem de teste
router.post('/test', sendTestValidation, whatsappCampaignController.sendTest);

// Buscar campanha por ID
router.get('/:id', whatsappCampaignController.get);

// Estatísticas de uma campanha
router.get('/:id/stats', whatsappCampaignController.stats);

// Listar destinatários de uma campanha
router.get('/:id/recipients', listQueryValidation, whatsappCampaignController.listRecipients);

// Criar campanha
router.post('/', createCampaignValidation, whatsappCampaignController.create);

// Atualizar campanha
router.put('/:id', updateCampaignValidation, whatsappCampaignController.update);

// Excluir campanha
router.delete('/:id', whatsappCampaignController.delete);

// Iniciar envio da campanha
router.post('/:id/send', whatsappCampaignController.send);

// Cancelar campanha em envio
router.post('/:id/cancel', whatsappCampaignController.cancel);

export default router;
