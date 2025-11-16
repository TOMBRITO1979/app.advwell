import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import smtpConfigController from '../controllers/smtp-config.controller';

const router = Router();

// Todas as rotas requerem autenticação e ADMIN
router.use(authenticate, validateTenant, requireAdmin);

// Validações
const smtpConfigValidation = [
  body('host').notEmpty().isString().withMessage('Host SMTP é obrigatório'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Porta deve ser entre 1 e 65535'),
  body('user').notEmpty().isString().withMessage('Usuário SMTP é obrigatório'),
  body('password').notEmpty().isString().withMessage('Senha SMTP é obrigatória'),
  body('fromEmail').isEmail().withMessage('Email remetente inválido'),
  body('fromName').optional().isString(),
];

// Routes
router.get('/', smtpConfigController.get);
router.post('/', smtpConfigValidation, smtpConfigController.createOrUpdate);
router.put('/', smtpConfigValidation, smtpConfigController.createOrUpdate);
router.post('/test', smtpConfigController.test);
router.delete('/', smtpConfigController.delete);

export default router;
