import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import clientController from '../controllers/client.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { upload, csvUpload, validateUploadContent } from '../middleware/upload';
import { validatePagination } from '../middleware/validation';
import { companyRateLimit, csvImportRateLimit } from '../middleware/company-rate-limit';

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

// Validações para criação de cliente
const createClientValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('cpf')
    .optional({ checkFalsy: true })
    .matches(/^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/)
    .withMessage('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos (com ou sem formatação)'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Telefone deve ter no máximo 20 caracteres'),
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Endereço deve ter no máximo 500 caracteres'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('birthDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  body('maritalStatus')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Estado civil deve ter no máximo 50 caracteres'),
  body('profession')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Profissão deve ter no máximo 100 caracteres'),
];

// Validações para atualização de cliente
const updateClientValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('cpf')
    .optional({ checkFalsy: true })
    .matches(/^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/)
    .withMessage('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos (com ou sem formatação)'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Telefone deve ter no máximo 20 caracteres'),
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Endereço deve ter no máximo 500 caracteres'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
  body('birthDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  body('maritalStatus')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage('Estado civil deve ter no máximo 50 caracteres'),
  body('profession')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Profissão deve ter no máximo 100 caracteres'),
];

router.post('/', createClientValidation, validate, clientController.create);
router.get('/', validatePagination, clientController.list);
router.get('/search', validatePagination, clientController.search); // Busca rápida para autocomplete
router.get('/export/csv', validatePagination, clientController.exportCSV);
router.get('/export/pdf', validatePagination, clientController.exportPDF);
router.get('/export/status/:jobId', clientController.getExportStatus);
router.post('/import/csv', csvImportRateLimit, csvUpload.single('file'), validateUploadContent, clientController.importCSV);
router.get('/import/status/:jobId', clientController.getImportStatus);
router.get('/:id', clientController.get);
router.put('/:id', updateClientValidation, validate, clientController.update);
router.delete('/:id', clientController.delete);

export default router;
