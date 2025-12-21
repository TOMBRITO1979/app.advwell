import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// SEGURANCA: Rate limiting especifico para embed auth (previne forca bruta em API keys)
const embedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 tentativas por IP
  message: { error: 'Muitas tentativas de embed auth. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SEGURANCA: Rate limiting para verificacao de email
const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP
  message: { error: 'Muitas tentativas de verificação. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
    .isLength({ min: 12, max: 100 })
    .withMessage('Senha deve ter entre 12 e 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~])/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%^&*...)'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome da empresa deve ter entre 2 e 200 caracteres'),
  body('cnpj')
    .optional({ checkFalsy: true })
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
    .isLength({ min: 12, max: 100 })
    .withMessage('Senha deve ter entre 12 e 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~])/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%^&*...)'),
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

// Validações para refresh token
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .isString()
    .withMessage('Refresh token é obrigatório'),
];

// Aplicar validações nas rotas
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/refresh', refreshTokenValidation, validate, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
router.post('/verify-email', emailVerificationLimiter, verifyEmailValidation, validate, authController.verifyEmail);
router.post('/resend-verification', emailVerificationLimiter, resendVerificationValidation, validate, authController.resendVerificationEmail);
router.get('/me', authenticate, authController.me);

// Embed authentication - auto-login for Chatwell integration
// SEGURANCA: Rate limiting especifico para prevenir forca bruta em API keys
router.get('/embed/:token', embedAuthLimiter, authController.embedAuth);

export default router;
