import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import scheduleController from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { validatePagination } from '../middleware/validation';
import { validate } from '../middleware/validation';
import { companyRateLimit } from '../middleware/company-rate-limit';

// Configurar multer para upload de CSV em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  },
});

const router = Router();

// Aplicar middleware de autenticação, rate limit e validação de tenant
router.use(authenticate, companyRateLimit, validateTenant);

// Validações
const createValidation = [
  body('title').trim().notEmpty().withMessage('Título é obrigatório').isLength({ max: 200 }).withMessage('Título muito longo'),
  body('type').isIn(['COMPROMISSO', 'TAREFA', 'PRAZO', 'AUDIENCIA', 'PERICIA', 'GOOGLE_MEET']).withMessage('Tipo inválido'),
  body('date').isISO8601().withMessage('Data é obrigatória e deve ser válida'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('Data de fim inválida'),
  body('clientId').optional({ nullable: true }).isUUID().withMessage('ID do cliente inválido'),
  body('caseId').optional({ nullable: true }).isUUID().withMessage('ID do caso inválido'),
  validate,
];

const updateValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('title').optional().trim().notEmpty().withMessage('Título não pode ser vazio').isLength({ max: 200 }),
  body('type').optional().isIn(['COMPROMISSO', 'TAREFA', 'PRAZO', 'AUDIENCIA', 'PERICIA', 'GOOGLE_MEET']).withMessage('Tipo inválido'),
  body('date').optional().isISO8601().withMessage('Data inválida'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('Data de fim inválida'),
  validate,
];

const idValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  validate,
];

// Rotas CRUD
router.get('/', scheduleController.list);
router.get('/upcoming', scheduleController.upcoming); // Próximos eventos (para dashboard)
router.get('/tasks-today', scheduleController.getTasksDueToday); // Tarefas vencendo hoje (notificação sidebar)

// Export routes - must be before /:id routes
router.get('/export/pdf', scheduleController.exportPDF);
router.get('/export/csv', scheduleController.exportCSV);

// Import CSV route (background processing)
router.post('/import/csv', upload.single('file'), scheduleController.importCSV.bind(scheduleController));
router.get('/import/status/:jobId', scheduleController.getImportStatusEndpoint.bind(scheduleController));
router.get('/:id', idValidation, scheduleController.get);
router.post('/', createValidation, scheduleController.create);
router.put('/:id', updateValidation, scheduleController.update);
router.delete('/:id', idValidation, scheduleController.delete);
router.patch('/:id/toggle-complete', idValidation, scheduleController.toggleComplete);
router.post('/:id/send-whatsapp', idValidation, scheduleController.sendWhatsAppConfirmation);

export default router;
