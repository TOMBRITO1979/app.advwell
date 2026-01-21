import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { documentRequestController } from '../controllers/document-request.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Aplicar middleware de autenticação, rate limit e validação de tenant
router.use(authenticate, companyRateLimit, validateTenant);

// Validações
const createValidation = [
  body('clientId').isUUID().withMessage('ID do cliente inválido'),
  body('documentName').trim().notEmpty().withMessage('Nome do documento é obrigatório').isLength({ max: 255 }).withMessage('Nome muito longo'),
  body('description').optional({ nullable: true }).trim(),
  body('internalNotes').optional({ nullable: true }).trim(),
  body('dueDate').isISO8601().withMessage('Prazo é obrigatório e deve ser uma data válida'),
  body('notificationChannel').optional({ nullable: true }).isIn(['EMAIL', 'WHATSAPP', 'BOTH']).withMessage('Canal de notificação inválido'),
  body('emailTemplateId').optional({ nullable: true }).isUUID().withMessage('ID do template de email inválido'),
  body('whatsappTemplateId').optional({ nullable: true }).isUUID().withMessage('ID do template de WhatsApp inválido'),
  body('autoRemind').optional().isBoolean().withMessage('autoRemind deve ser booleano'),
  body('autoFollowup').optional().isBoolean().withMessage('autoFollowup deve ser booleano'),
  validate,
];

const updateValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('documentName').optional().trim().notEmpty().withMessage('Nome do documento não pode ser vazio').isLength({ max: 255 }),
  body('description').optional({ nullable: true }).trim(),
  body('internalNotes').optional({ nullable: true }).trim(),
  body('dueDate').optional().isISO8601().withMessage('Prazo deve ser uma data válida'),
  body('notificationChannel').optional({ nullable: true }).isIn(['EMAIL', 'WHATSAPP', 'BOTH']).withMessage('Canal de notificação inválido'),
  body('autoRemind').optional().isBoolean().withMessage('autoRemind deve ser booleano'),
  body('autoFollowup').optional().isBoolean().withMessage('autoFollowup deve ser booleano'),
  validate,
];

const idValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  validate,
];

const clientIdValidation = [
  param('clientId').isUUID().withMessage('ID do cliente inválido'),
  validate,
];

const listValidation = [
  query('clientId').optional().isUUID().withMessage('ID do cliente inválido'),
  query('status').optional().isIn(['PENDING', 'SENT', 'REMINDED', 'RECEIVED', 'CANCELLED']).withMessage('Status inválido'),
  query('startDate').optional().isISO8601().withMessage('Data inicial inválida'),
  query('endDate').optional().isISO8601().withMessage('Data final inválida'),
  query('overdue').optional().isIn(['true', 'false']).withMessage('overdue deve ser true ou false'),
  validate,
];

const markAsReceivedValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('receivedDocumentId').optional({ nullable: true }).isUUID().withMessage('ID do documento inválido'),
  body('clientNotes').optional({ nullable: true }).trim(),
  validate,
];

const submitValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('sharedDocumentId').optional({ nullable: true }).isUUID().withMessage('ID do documento inválido'),
  body('clientNotes').optional({ nullable: true }).trim(),
  validate,
];

// =====================
// Rotas do Escritório
// =====================

// Obter estatísticas (precisa vir antes de /:id para não conflitar)
router.get('/stats', documentRequestController.getStats.bind(documentRequestController));

// Listar vencidas (para dashboard)
router.get('/overdue', documentRequestController.listOverdue.bind(documentRequestController));

// Listar solicitações com filtros
router.get('/', listValidation, documentRequestController.list.bind(documentRequestController));

// Criar nova solicitação
router.post('/', createValidation, documentRequestController.create.bind(documentRequestController));

// Obter detalhes de uma solicitação
router.get('/:id', idValidation, documentRequestController.get.bind(documentRequestController));

// Atualizar solicitação
router.put('/:id', updateValidation, documentRequestController.update.bind(documentRequestController));

// Cancelar solicitação
router.delete('/:id', idValidation, documentRequestController.cancel.bind(documentRequestController));

// Enviar lembrete manual
router.post('/:id/reminder', idValidation, documentRequestController.sendReminder.bind(documentRequestController));

// Marcar como recebido
router.post('/:id/received', markAsReceivedValidation, documentRequestController.markAsReceived.bind(documentRequestController));

// =====================
// Rotas do Portal do Cliente
// =====================

// Listar solicitações do cliente
router.get('/client/:clientId', clientIdValidation, documentRequestController.listForClient.bind(documentRequestController));

// Cliente envia documento em resposta
router.post('/:id/submit', submitValidation, documentRequestController.clientSubmitDocument.bind(documentRequestController));

export default router;
