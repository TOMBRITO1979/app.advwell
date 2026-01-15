import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import companyController from '../controllers/company.controller';
import { authenticate, requireSuperAdmin, requireAdmin } from '../middleware/auth';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

router.use(authenticate);
router.use(companyRateLimit);

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

// Validações para atualização de empresa
const updateCompanyValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Telefone deve ter no máximo 20 caracteres'),
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Endereço deve ter no máximo 500 caracteres'),
];

// Validações para criação de empresa
const createCompanyValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('cnpj')
    .optional({ checkFalsy: true })
    .matches(/^(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/)
    .withMessage('CNPJ deve ter 14 dígitos'),
];

// Validação de UUID para parâmetros
const idParamValidation = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
];

// Validação para subscription update
const subscriptionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  body('subscriptionPlan')
    .optional({ checkFalsy: true })
    .isIn(['GRATUITO', 'BASICO', 'BRONZE', 'PRATA', 'OURO'])
    .withMessage('Plano inválido'),
  body('subscriptionStatus')
    .optional({ checkFalsy: true })
    .isIn(['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'])
    .withMessage('Status inválido'),
  body('storageLimit')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Limite de armazenamento deve ser numérico (bytes)'),
];

// Rotas do Admin (sua própria empresa) - DEVEM VIR ANTES DAS ROTAS COM :id
router.get('/own', requireAdmin, companyController.getOwn);
router.put('/own', requireAdmin, updateCompanyValidation, validate, companyController.updateOwn);
router.delete('/own', requireAdmin, companyController.deleteOwn);

// Portal do Cliente - Subdomain Management
router.get('/own/subdomain', requireAdmin, companyController.getSubdomain);
router.put('/own/subdomain', requireAdmin, companyController.updateSubdomain);

// API Key Management (Para integrações WhatsApp, N8N, etc)
router.get('/own/api-key', requireAdmin, companyController.getApiKey);
router.post('/own/api-key/regenerate', requireAdmin, companyController.regenerateApiKey);

// Storage Metrics (própria empresa - qualquer usuário autenticado)
router.get('/own/storage-metrics', companyController.getOwnStorageMetrics);

// Chatwell Integration (acesso para todos os usuários autenticados, verificação de permissão no controller)
router.get('/own/chatwell', companyController.getChatwellConfig);

// Rotas do Super Admin
router.get('/subscription-alerts', requireSuperAdmin, companyController.getSubscriptionAlerts);
router.get('/storage-metrics/all', requireSuperAdmin, companyController.getAllStorageMetrics);
router.get('/', requireSuperAdmin, companyController.list);
router.post('/', requireSuperAdmin, createCompanyValidation, validate, companyController.create);
router.get('/:id/users', requireSuperAdmin, idParamValidation, validate, companyController.getUsers);
router.get('/:id/storage-metrics', requireSuperAdmin, idParamValidation, validate, companyController.getStorageMetrics);
router.put('/:companyId/users/:userId/toggle-active', requireSuperAdmin, companyController.toggleUserActive);
router.put('/:id/subscription', requireSuperAdmin, subscriptionValidation, validate, companyController.updateSubscription);
router.get('/:id/last-payment', requireSuperAdmin, idParamValidation, validate, companyController.getCompanyLastPayment);
router.put('/:id', requireSuperAdmin, idParamValidation, updateCompanyValidation, validate, companyController.update);
router.delete('/:id', requireSuperAdmin, idParamValidation, validate, companyController.delete);

// Chatwell Configuration (Super Admin only)
router.get('/:id/chatwell', requireSuperAdmin, idParamValidation, validate, companyController.getChatwellConfigForCompany);
router.put('/:id/chatwell', requireSuperAdmin, idParamValidation, validate, companyController.updateChatwellConfig);

export default router;
