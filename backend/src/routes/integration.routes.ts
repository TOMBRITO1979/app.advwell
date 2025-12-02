import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import integrationController from '../controllers/integration.controller';
import { authenticateApiKey } from '../middleware/apikey';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * Rate Limiter dedicado para rotas de integração
 * - Limite: 20 requisições por 15 minutos
 * - Identificação: Por API Key (header X-API-Key)
 * - Mais restritivo que o rate limit geral (100/15min por IP)
 */
const integrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requisições por API Key
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usa API Key como identificador único
    // Se não houver API Key, usa IP como fallback
    return req.get('X-API-Key') || req.ip || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitas requisições',
      message: 'Limite de 20 requisições por 15 minutos excedido para esta API Key',
      retryAfter: '15 minutos'
    });
  },
});

/**
 * Aplica rate limiting ANTES da autenticação
 * Isso previne abuso mesmo com tentativas de autenticação inválidas
 */
router.use(integrationRateLimiter);

/**
 * Todas as rotas de integração requerem autenticação via API Key
 * Header necessário: X-API-Key: sua-api-key-aqui
 */
router.use(authenticateApiKey);

// Validações
const syncUserValidation = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório').isLength({ max: 200 }),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
  body('role').optional().isIn(['ADMIN', 'USER']).withMessage('Role inválido'),
  validate,
];

const updatePasswordValidation = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('newPassword').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
  validate,
];

const ssoTokenValidation = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  validate,
];

const validateClientValidation = [
  body('cpf').trim().notEmpty().withMessage('CPF é obrigatório').matches(/^\d{11}$/).withMessage('CPF deve ter 11 dígitos'),
  body('birthDate').isISO8601().withMessage('Data de nascimento inválida'),
  validate,
];

const clientIdValidation = [
  param('clientId').isUUID().withMessage('ID do cliente inválido'),
  validate,
];

const caseIdValidation = [
  param('clientId').isUUID().withMessage('ID do cliente inválido'),
  param('caseId').isUUID().withMessage('ID do caso inválido'),
  validate,
];

/**
 * POST /api/integration/sync-user
 * Sincroniza usuário do Chatwoot com AdvWell
 *
 * Body: { name, email, password? }
 * Cria usuário com role ADMIN se não existir
 */
router.post('/sync-user', syncUserValidation, integrationController.syncUser);

/**
 * POST /api/integration/update-password
 * Atualiza senha de um usuário
 *
 * Body: { email, newPassword }
 * Usado quando usuário reseta senha no Chatwoot
 */
router.post('/update-password', updatePasswordValidation, integrationController.updatePassword);

/**
 * POST /api/integration/sso-token
 * Gera token JWT para login automático (SSO)
 *
 * Body: { email }
 * Retorna: { token, user }
 */
router.post('/sso-token', ssoTokenValidation, integrationController.generateSsoToken);

// ============================================
// ENDPOINTS PARA IA DO WHATSAPP
// ============================================

/**
 * POST /api/integration/validate-client
 * Valida cliente por CPF e data de nascimento
 *
 * Body: { cpf, birthDate }
 * Retorna: { valid: true, clientId, name } ou { valid: false, message }
 */
router.post('/validate-client', validateClientValidation, integrationController.validateClient);

/**
 * GET /api/integration/client/:clientId/cases
 * Lista processos de um cliente
 *
 * Retorna: { clientName, totalCases, cases: [...] }
 */
router.get('/client/:clientId/cases', clientIdValidation, integrationController.getClientCases);

/**
 * GET /api/integration/client/:clientId/case/:caseId/movements
 * Lista movimentações de um processo específico
 *
 * Retorna: { processNumber, subject, informarCliente, movements: [...] }
 */
router.get('/client/:clientId/case/:caseId/movements', caseIdValidation, integrationController.getCaseMovements);

/**
 * GET /api/integration/client/:clientId/schedule
 * Lista agenda/compromissos do cliente (audiências, prazos)
 *
 * Retorna: { clientName, upcomingEvents: [...], caseDeadlines: [...] }
 */
router.get('/client/:clientId/schedule', clientIdValidation, integrationController.getClientSchedule);

export default router;
