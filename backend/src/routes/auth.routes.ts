import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

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

// Validações para registro
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\.\-\']+$/)
    .withMessage('Nome deve conter apenas letras, números, espaços e caracteres comuns'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Senha deve ter entre 6 e 100 caracteres'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome da empresa deve ter entre 2 e 200 caracteres'),
  body('cnpj')
    .optional()
    .matches(/^\d{14}$/)
    .withMessage('CNPJ deve ter exatamente 14 dígitos numéricos'),
];

// Validações para login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
];

// Validações para forgot password
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
];

// Validações para reset password
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .isString()
    .isLength({ min: 10 })
    .withMessage('Token inválido'),
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('Senha deve ter entre 6 e 100 caracteres'),
];

// Validações para verificação de email
const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .isString()
    .isLength({ min: 10 })
    .withMessage('Token inválido'),
];

// Validações para reenvio de verificação
const resendVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
];

// Aplicar validações nas rotas
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
router.post('/verify-email', verifyEmailValidation, validate, authController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, validate, authController.resendVerificationEmail);
router.get('/me', authenticate, authController.me);

export default router;
