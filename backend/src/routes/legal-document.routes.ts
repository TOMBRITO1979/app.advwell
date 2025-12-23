import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import {
  listLegalDocuments,
  getLegalDocument,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  generatePDF,
  reviewWithAI,
  getClientQualification,
} from '../controllers/legal-document.controller';

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

// Validações para criação de documento
const createDocumentValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Título deve ter entre 2 e 200 caracteres'),
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Conteúdo deve ter no mínimo 10 caracteres'),
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('signerId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do assinante inválido'),
  body('documentDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data inválida'),
];

// Validações para atualização de documento
const updateDocumentValidation = [
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Título deve ter entre 2 e 200 caracteres'),
  body('content')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10 })
    .withMessage('Conteúdo deve ter no mínimo 10 caracteres'),
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('signerId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do assinante inválido'),
  body('documentDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data inválida'),
];

// Rotas
router.get('/', listLegalDocuments);                                          // Listar documentos
router.get('/client/:clientId/qualification', getClientQualification);        // Buscar qualificação do cliente
router.get('/:id', getLegalDocument);                                         // Buscar documento por ID
router.get('/:id/pdf', generatePDF);                                          // Gerar PDF do documento
router.post('/:id/review', reviewWithAI);                                     // Revisar com IA
router.post('/', createDocumentValidation, validate, createLegalDocument);    // Criar documento
router.put('/:id', updateDocumentValidation, validate, updateLegalDocument);  // Atualizar documento
router.delete('/:id', deleteLegalDocument);                                   // Excluir documento

export default router;
