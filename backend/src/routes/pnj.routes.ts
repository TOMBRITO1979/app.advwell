import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import pnjController from '../controllers/pnj.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit, csvImportRateLimit } from '../middleware/company-rate-limit';
import { upload, csvUpload, validateUploadContent } from '../middleware/upload';

const router = Router();

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

// Validações para criação/atualização de PNJ
const pnjValidation = [
  body('number')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Número deve ter entre 1 e 100 caracteres'),
  body('protocol')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Protocolo deve ter no máximo 100 caracteres'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Título deve ter entre 1 e 500 caracteres'),
  body('description')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Descrição deve ter no máximo 10000 caracteres'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['ACTIVE', 'ARCHIVED', 'CLOSED'])
    .withMessage('Status inválido'),
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('adverseId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do adverso inválido'),
  body('openDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de abertura inválida'),
  body('closeDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de encerramento inválida'),
];

// Validações para parte do PNJ
const partValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Nome da parte deve ter entre 1 e 300 caracteres'),
  body('document')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Documento deve ter no máximo 30 caracteres'),
  body('type')
    .isIn(['AUTHOR', 'DEFENDANT', 'INTERESTED', 'THIRD_PARTY', 'OTHER'])
    .withMessage('Tipo de parte inválido'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validações para andamento do PNJ
const movementValidation = [
  body('date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data inválida'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Descrição deve ter entre 1 e 10000 caracteres'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// ============================================================================
// CRUD de PNJ
// ============================================================================
router.get('/', pnjController.list);
router.get('/export/csv', pnjController.exportCSV);
router.post('/import/csv', csvImportRateLimit, csvUpload.single('file'), validateUploadContent, pnjController.importCSV);
router.get('/import/status/:jobId', pnjController.getImportStatus);
router.get('/:id', pnjController.getById);
router.post('/', pnjValidation, validate, pnjController.create);
router.put('/:id', pnjValidation, validate, pnjController.update);
router.delete('/:id', pnjController.delete);

// ============================================================================
// Partes do PNJ
// ============================================================================
router.post('/:id/parts', partValidation, validate, pnjController.addPart);
router.put('/:id/parts/:partId', partValidation, validate, pnjController.updatePart);
router.delete('/:id/parts/:partId', pnjController.removePart);

// ============================================================================
// Andamentos do PNJ
// ============================================================================
router.post('/:id/movements', movementValidation, validate, pnjController.addMovement);
router.put('/:id/movements/:movementId', movementValidation, validate, pnjController.updateMovement);
router.delete('/:id/movements/:movementId', pnjController.removeMovement);

// ============================================================================
// Documentos do PNJ
// ============================================================================
router.get('/:id/documents', pnjController.listDocuments);
router.post('/:id/documents/upload', upload.single('file'), validateUploadContent, pnjController.uploadDocument);
router.post('/:id/documents/link', [
  body('name').trim().isLength({ min: 1, max: 300 }).withMessage('Nome deve ter entre 1 e 300 caracteres'),
  body('externalUrl').trim().isURL().withMessage('URL inválida'),
  body('externalType').optional().isIn(['google_drive', 'google_docs', 'minio', 'other']).withMessage('Tipo inválido'),
], validate, pnjController.addExternalLink);
router.delete('/:id/documents/:documentId', pnjController.deleteDocument);

export default router;
