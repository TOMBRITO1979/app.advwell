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
  generateOrReviewWithAI,
  getClientQualification,
  listDocumentParties,
  addDocumentParty,
  updateDocumentParty,
  removeDocumentParty,
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
    .optional({ checkFalsy: true })
    .trim(),
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
    .trim(),
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

// Validações para criação de parte
const createPartyValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('type')
    .isIn(['AUTOR', 'REU', 'ADVOGADO', 'TESTEMUNHA', 'OUTRO'])
    .withMessage('Tipo de parte inválido'),
  body('cpfCnpj')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('CPF/CNPJ inválido'),
  body('oab')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('OAB inválido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Telefone inválido'),
];

// Validações para atualização de parte
const updatePartyValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('type')
    .optional({ checkFalsy: true })
    .isIn(['AUTOR', 'REU', 'ADVOGADO', 'TESTEMUNHA', 'OUTRO'])
    .withMessage('Tipo de parte inválido'),
  body('cpfCnpj')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('CPF/CNPJ inválido'),
  body('oab')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('OAB inválido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Telefone inválido'),
];

// Rotas de documentos
router.get('/', listLegalDocuments);                                          // Listar documentos
router.get('/client/:clientId/qualification', getClientQualification);        // Buscar qualificação do cliente
router.get('/:id', getLegalDocument);                                         // Buscar documento por ID
router.get('/:id/pdf', generatePDF);                                          // Gerar PDF do documento
router.post('/:id/review', reviewWithAI);                                     // Revisar com IA (documento existente)
router.post('/ai/generate', generateOrReviewWithAI);                          // Gerar ou revisar com IA (sem salvar)
router.post('/', createDocumentValidation, validate, createLegalDocument);    // Criar documento
router.put('/:id', updateDocumentValidation, validate, updateLegalDocument);  // Atualizar documento
router.delete('/:id', deleteLegalDocument);                                   // Excluir documento

// Rotas de partes do documento
router.get('/:documentId/parties', listDocumentParties);                                        // Listar partes
router.post('/:documentId/parties', createPartyValidation, validate, addDocumentParty);         // Adicionar parte
router.put('/:documentId/parties/:partyId', updatePartyValidation, validate, updateDocumentParty); // Atualizar parte
router.delete('/:documentId/parties/:partyId', removeDocumentParty);                            // Remover parte

export default router;
