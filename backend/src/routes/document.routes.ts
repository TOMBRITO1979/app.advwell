import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { validatePagination } from '../middleware/validation';
import { upload, validateUploadContent } from '../middleware/upload';
import { companyRateLimit } from '../middleware/company-rate-limit';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  uploadDocument,
  getDownloadUrl,
  getUnifiedDocumentsByClient,
} from '../controllers/document.controller';

const router = Router();

// Aplicar autenticação, rate limit e validação de tenant em todas as rotas
router.use(authenticate, companyRateLimit, validateTenant);

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

// Validação para criação de documento (link externo)
const createDocumentValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Nome deve ter entre 1 e 200 caracteres'),
  body('type')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Tipo deve ter no máximo 100 caracteres'),
  body('url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL inválida'),
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('caseId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do processo inválido'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validação para atualização de documento
const updateDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Nome deve ter entre 1 e 200 caracteres'),
  body('type')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Tipo deve ter no máximo 100 caracteres'),
  body('url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL inválida'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validação de UUID para parâmetros
const idParamValidation = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
];

// Rotas de documentos
router.get('/', listDocuments);                              // Listar documentos com filtros
router.get('/search', searchDocuments);                      // Buscar por cliente ou processo
router.get('/client/:clientId/unified', getUnifiedDocumentsByClient); // Documentos unificados por cliente
router.post('/upload', upload.single('file'), validateUploadContent, uploadDocument); // Upload de arquivo para S3
router.get('/:id/download', idParamValidation, validate, getDownloadUrl);                 // Gerar URL de download
router.get('/:id', idParamValidation, validate, getDocument);                             // Buscar documento por ID
router.post('/', createDocumentValidation, validate, createDocument);                            // Criar novo documento (link externo)
router.put('/:id', updateDocumentValidation, validate, updateDocument);                          // Atualizar documento
router.delete('/:id', idParamValidation, validate, deleteDocument);                       // Excluir documento

export default router;
