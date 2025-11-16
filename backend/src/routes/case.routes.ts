import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import caseController from '../controllers/case.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
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
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARCHIVED', 'FINISHED'])
    .withMessage('Status deve ser ACTIVE, ARCHIVED ou FINISHED'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('informarCliente')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Informação ao cliente deve ter no máximo 5000 caracteres'),
  body('linkProcesso')
    .optional()
    .isURL()
    .withMessage('Link do processo deve ser uma URL válida'),
];

// Validações para atualização de processo
const updateCaseValidation = [
  body('clientId')
    .optional()
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('processNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Número do processo deve ter entre 5 e 50 caracteres'),
  body('court')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Tribunal deve ter entre 2 e 200 caracteres'),
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Assunto deve ter entre 2 e 500 caracteres'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARCHIVED', 'FINISHED'])
    .withMessage('Status deve ser ACTIVE, ARCHIVED ou FINISHED'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('informarCliente')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Informação ao cliente deve ter no máximo 5000 caracteres'),
  body('linkProcesso')
    .optional()
    .isURL()
    .withMessage('Link do processo deve ser uma URL válida'),
];

router.post('/', createCaseValidation, validate, caseController.create);
router.get('/', caseController.list);
router.get('/search', caseController.search); // Busca rápida para autocomplete
router.get('/export/csv', caseController.exportCSV);
router.post('/import/csv', upload.single('file'), caseController.importCSV);
router.get('/updates', caseController.getPendingUpdates); // Lista atualizações pendentes
router.get('/:id', caseController.get);
router.put('/:id', updateCaseValidation, validate, caseController.update);
router.post('/:id/sync', caseController.syncMovements);
router.post('/:id/acknowledge', caseController.acknowledgeUpdate); // Marca como ciente

export default router;
