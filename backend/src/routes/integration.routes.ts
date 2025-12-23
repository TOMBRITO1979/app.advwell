import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import integrationController from '../controllers/integration.controller';
import { authenticateApiKey } from '../middleware/apikey';
import { validate } from '../middleware/validation';
import { redis } from '../utils/redis';

const router = Router();

/**
 * SEGURANCA: Cria Redis store para rate limiting distribuido
 * Compartilhado entre todas as replicas do backend
 */
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:integration:${prefix}:`,
});

/**
 * Rate Limiter dedicado para rotas de integração
 * - Limite: 20 requisições por 15 minutos
 * - Identificação: Por API Key (header X-API-Key)
 * - SEGURANCA: Usa Redis store - limite compartilhado entre todas as replicas
 */
const integrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requisições por API Key
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('apikey'),
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

// ============================================
// ENDPOINTS PARA INTEGRAÇÃO COM N8N
// ============================================

/**
 * GET /api/integration/stats
 * Retorna estatísticas da empresa
 *
 * Retorna: { clients, cases, leads, schedule }
 */
router.get('/stats', integrationController.getStats);

/**
 * GET /api/integration/clients/search
 * Busca cliente por telefone, email ou CPF
 *
 * Query: ?phone=xxx ou ?email=xxx ou ?cpf=xxx
 * Retorna: { found: true/false, client?: {...} }
 */
router.get('/clients/search', integrationController.searchClient);

/**
 * POST /api/integration/clients
 * Cria um novo cliente
 *
 * Body: { name, cpf?, email?, phone?, birthDate?, address?, city?, state?, zipCode?, notes? }
 * Retorna: { success: true, client: {...} }
 */
router.post('/clients', integrationController.createClient);

/**
 * PUT /api/integration/clients/:id
 * Atualiza um cliente existente
 *
 * Body: campos a serem atualizados
 * Retorna: { success: true, client: {...} }
 */
router.put('/clients/:id', integrationController.updateClient);

/**
 * POST /api/integration/cases
 * Cria um novo processo
 *
 * Body: { clientId, processNumber, court, subject, value?, status?, notes?, deadline?, linkProcesso? }
 * Retorna: { success: true, case: {...} }
 */
router.post('/cases', integrationController.createCase);

/**
 * PUT /api/integration/cases/:id
 * Atualiza um processo existente
 *
 * Body: campos a serem atualizados
 * Retorna: { success: true, case: {...} }
 */
router.put('/cases/:id', integrationController.updateCase);

/**
 * POST /api/integration/schedule
 * Cria um novo evento na agenda
 *
 * Body: { title, date, description?, type?, priority?, endDate?, clientId?, caseId?, googleMeetLink? }
 * Retorna: { success: true, event: {...} }
 */
router.post('/schedule', integrationController.createScheduleEvent);

/**
 * POST /api/integration/leads
 * Cria um novo lead
 *
 * Body: { name, phone, email?, contactReason?, source?, notes? }
 * Retorna: { success: true, lead: {...} }
 */
router.post('/leads', integrationController.createLead);

export default router;
