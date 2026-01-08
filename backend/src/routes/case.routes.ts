import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import caseController from '../controllers/case.controller';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { upload, csvUpload, validateUploadContent } from '../middleware/upload';
import { validatePagination } from '../middleware/validation';
import { companyRateLimit, csvImportRateLimit } from '../middleware/company-rate-limit';
import { redis } from '../utils/redis';

const router = Router();

// TAREFA 2.5: Rate limiting Redis-backed para AI e DataJud
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:case:${prefix}:`,
});

// Rate limit para sincronizacao DataJud (API externa com limites proprios)
const datajudSyncRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // 50 syncs por hora por empresa
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('datajud'),
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.companyId || req.ip || 'unknown';
  },
  message: { error: 'Limite de sincronização DataJud atingido. Máximo de 50 por hora.' },
});

// Rate limit para geracao de resumo com IA (operacao custosa)
const aiSummaryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // 30 resumos por hora por empresa
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('ai-summary'),
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.companyId || req.ip || 'unknown';
  },
  message: { error: 'Limite de geração de resumos IA atingido. Máximo de 30 por hora.' },
});

router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

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

// Validações para criação de processo
const createCaseValidation = [
  body('clientId')
    .notEmpty()
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('processNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Número do processo deve ter entre 5 e 50 caracteres'),
  body('court')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Tribunal deve ter entre 2 e 200 caracteres'),
  body('subject')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Assunto deve ter entre 2 e 500 caracteres'),
  body('value')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['PENDENTE', 'ACTIVE', 'ARCHIVED', 'FINISHED'])
    .withMessage('Status deve ser PENDENTE, ACTIVE, ARCHIVED ou FINISHED'),
  body('deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Deadline deve ser uma data válida no formato ISO8601'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('informarCliente')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Informação ao cliente deve ter no máximo 5000 caracteres'),
  body('linkProcesso')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Link do processo deve ser uma URL válida'),
];

// Validações para atualização de processo
const updateCaseValidation = [
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('processNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Número do processo deve ter entre 5 e 50 caracteres'),
  body('court')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Tribunal deve ter entre 2 e 200 caracteres'),
  body('subject')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Assunto deve ter entre 2 e 500 caracteres'),
  body('value')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['PENDENTE', 'ACTIVE', 'ARCHIVED', 'FINISHED'])
    .withMessage('Status deve ser PENDENTE, ACTIVE, ARCHIVED ou FINISHED'),
  body('deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Deadline deve ser uma data válida no formato ISO8601'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('informarCliente')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Informação ao cliente deve ter no máximo 5000 caracteres'),
  body('linkProcesso')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Link do processo deve ser uma URL válida'),
];

// Validação de UUID para parâmetros de rota
const idParamValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do processo inválido'),
];

// Validação para atualização de deadline
const updateDeadlineValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do processo inválido'),
  body('deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Deadline deve ser uma data válida'),
  body('deadlineDescription')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
];

router.post('/', createCaseValidation, validate, caseController.create);
router.get('/', validatePagination, caseController.list);
router.get('/search', validatePagination, caseController.search); // Busca rápida para autocomplete
router.get('/deadlines', validatePagination, caseController.getDeadlines); // Lista processos com prazo
router.get('/deadlines-today', caseController.getDeadlinesToday); // Prazos vencendo hoje (notificação sidebar)
router.put('/:id/deadline', updateDeadlineValidation, validate, caseController.updateDeadline); // Atualiza prazo do processo
router.post('/:id/deadline/toggle', idParamValidation, validate, caseController.toggleDeadlineCompleted); // Marca prazo como cumprido/não cumprido
router.get('/export/csv', validatePagination, caseController.exportCSV);
router.post('/import/csv', csvImportRateLimit, csvUpload.single('file'), validateUploadContent, caseController.importCSV);
router.get('/import/status/:jobId', caseController.getImportStatus);
router.get('/updates', validatePagination, caseController.getPendingUpdates); // Lista atualizações pendentes
router.get('/:id/audit-logs', idParamValidation, validate, caseController.getAuditLogs); // Busca logs de auditoria
router.get('/:id', idParamValidation, validate, caseController.get);
router.put('/:id', updateCaseValidation, validate, caseController.update);
router.delete('/:id', idParamValidation, validate, caseController.delete); // Excluir processo
// TAREFA 2.5: Rate limits especificos para operacoes externas
router.post('/:id/sync', datajudSyncRateLimiter, idParamValidation, validate, caseController.syncMovements);
router.post('/:id/generate-summary', aiSummaryRateLimiter, idParamValidation, validate, caseController.generateSummary); // Gera resumo com IA
router.post('/:id/acknowledge', idParamValidation, validate, caseController.acknowledgeUpdate); // Marca como ciente

export default router;
