import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import leadController from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

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

// Validações para criação de lead
const createLeadValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Telefone deve ter no máximo 20 caracteres'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('contactReason')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Motivo do contato deve ter no máximo 5000 caracteres'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['NOVO', 'CONTATADO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO'])
    .withMessage('Status inválido'),
  body('source')
    .optional({ checkFalsy: true })
    .isIn(['WHATSAPP', 'TELEFONE', 'SITE', 'INDICACAO', 'REDES_SOCIAIS', 'OUTROS'])
    .withMessage('Origem inválida'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validações para atualização de lead
const updateLeadValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage('Telefone deve ter no máximo 20 caracteres'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('contactReason')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Motivo do contato deve ter no máximo 5000 caracteres'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['NOVO', 'CONTATADO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO'])
    .withMessage('Status inválido'),
  body('source')
    .optional({ checkFalsy: true })
    .isIn(['WHATSAPP', 'TELEFONE', 'SITE', 'INDICACAO', 'REDES_SOCIAIS', 'OUTROS'])
    .withMessage('Origem inválida'),
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Observações devem ter no máximo 5000 caracteres'),
];

// Validações para conversão de lead para cliente
const convertLeadValidation = [
  body('personType')
    .optional({ checkFalsy: true })
    .isIn(['FISICA', 'JURIDICA'])
    .withMessage('Tipo de pessoa inválido'),
  body('cpf')
    .optional({ checkFalsy: true })
    .matches(/^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/)
    .withMessage('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'),
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Endereço deve ter no máximo 500 caracteres'),
  body('birthDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
];

// Rotas de leads
// IMPORTANTE: Rotas específicas ANTES de rotas com parâmetros (:id)

// Consultar se telefone já é cliente (para integração WhatsApp)
router.get('/check-phone', leadController.checkPhone);

// Estatísticas de leads
router.get('/stats', leadController.stats);

// CRUD padrão
router.post('/', createLeadValidation, validate, leadController.create);
router.get('/', leadController.list);
router.get('/:id', leadController.get);
router.put('/:id', updateLeadValidation, validate, leadController.update);
router.delete('/:id', leadController.delete);

// Converter lead para cliente
router.post('/:id/convert', convertLeadValidation, validate, leadController.convertToClient);

export default router;
