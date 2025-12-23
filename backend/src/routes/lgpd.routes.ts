import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import lgpdController from '../controllers/lgpd.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { redis } from '../utils/redis';

const router = Router();

// TAREFA 2.4: Rate limiting Redis-backed para LGPD
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:lgpd:${prefix}:`,
});

// Rate limit para registro de consentimento (previne flood)
const consentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 registros por hora por IP
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('consent'),
  message: { error: 'Muitos registros de consentimento. Tente novamente mais tarde.' },
});

// Rate limit para solicitações LGPD (muito restritivo)
const lgpdRequestRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 5, // 5 solicitações por dia por IP
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('request'),
  message: { error: 'Limite de solicitações LGPD atingido. Máximo de 5 por dia.' },
});

// Rate limit para visualização de dados (operação pesada)
const myDataRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 consultas por 15 min
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('mydata'),
  message: { error: 'Muitas consultas de dados. Aguarde alguns minutos.' },
});

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

// ==========================================
// ROTAS PÚBLICAS (sem autenticação)
// ==========================================

// Obter política de privacidade
router.get('/privacy-policy', lgpdController.getPrivacyPolicy);

// Obter termos de uso
router.get('/terms', lgpdController.getTermsOfUse);

// Registrar consentimento (usado no registro)
const recordConsentValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('consentType')
    .isIn(['PRIVACY_POLICY', 'TERMS_OF_USE', 'MARKETING_EMAIL', 'DATA_PROCESSING'])
    .withMessage('Tipo de consentimento inválido'),
  body('version')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Versão deve ter entre 1 e 20 caracteres'),
  body('documentHash')
    .optional()
    .isString()
    .withMessage('Hash do documento deve ser uma string'),
];
router.post('/consent', consentRateLimiter, recordConsentValidation, validate, lgpdController.recordConsent);

// ==========================================
// ROTAS AUTENTICADAS (usuário logado)
// ==========================================

// Obter meus consentimentos
router.get('/my-consents', authenticate, validateTenant, lgpdController.getMyConsents);

// Revogar consentimento
const revokeConsentValidation = [
  body('consentType')
    .isIn(['PRIVACY_POLICY', 'TERMS_OF_USE', 'MARKETING_EMAIL', 'DATA_PROCESSING'])
    .withMessage('Tipo de consentimento inválido'),
];
router.post('/revoke-consent', authenticate, validateTenant, revokeConsentValidation, validate, lgpdController.revokeConsent);

// Ver meus dados (TAREFA 2.4: Rate limit para operação pesada)
router.get('/my-data', myDataRateLimiter, authenticate, validateTenant, lgpdController.getMyData);

// Criar solicitação LGPD
const createRequestValidation = [
  body('requestType')
    .isIn(['ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY', 'REVOKE_CONSENT'])
    .withMessage('Tipo de solicitação inválido'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Descrição deve ter no máximo 2000 caracteres'),
];
// TAREFA 2.4: Rate limit restritivo para criacao de solicitacoes
router.post('/request', lgpdRequestRateLimiter, authenticate, validateTenant, createRequestValidation, validate, lgpdController.createRequest);

// Listar minhas solicitações
router.get('/requests', authenticate, validateTenant, lgpdController.listMyRequests);


// ==========================================
// ROTAS ADMIN (apenas administradores)
// ==========================================

// Listar solicitações pendentes (admin)
router.get('/admin/requests/pending', authenticate, validateTenant, requireAdmin, lgpdController.listPendingRequests);

// Processar solicitação (admin)
const processRequestValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de solicitação inválido'),
  body('status')
    .isIn(['IN_PROGRESS', 'COMPLETED', 'REJECTED'])
    .withMessage('Status inválido'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Notas devem ter no máximo 2000 caracteres'),
  body('rejectionReason')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Motivo de rejeição deve ter no máximo 1000 caracteres'),
  body('resultUrl')
    .optional()
    .isURL()
    .withMessage('URL do resultado inválida'),
];
router.put('/admin/requests/:id', authenticate, validateTenant, requireAdmin, processRequestValidation, validate, lgpdController.processRequest);

export default router;
