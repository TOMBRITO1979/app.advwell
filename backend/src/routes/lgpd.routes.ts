import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import lgpdController from '../controllers/lgpd.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

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
router.post('/consent', recordConsentValidation, validate, lgpdController.recordConsent);

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

// Ver meus dados
router.get('/my-data', authenticate, validateTenant, lgpdController.getMyData);

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
router.post('/request', authenticate, validateTenant, createRequestValidation, validate, lgpdController.createRequest);

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
