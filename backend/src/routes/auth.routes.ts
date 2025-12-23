import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { redis } from '../utils/redis';

const router = Router();

// SEGURANCA: Redis store para rate limiting distribuido
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:auth:${prefix}:`,
});

// SEGURANCA: Rate limiting especifico para embed auth (previne forca bruta em API keys)
const embedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 tentativas por IP
  message: { error: 'Muitas tentativas de embed auth. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('embed'),
});

// SEGURANCA: Rate limiting para verificacao de email
const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP
  message: { error: 'Muitas tentativas de verificação. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('email-verify'),
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

// TAREFA 2.1: Logout seguro com blacklist de token
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Embed authentication - auto-login for Chatwell integration
// SEGURANCA: Rate limiting especifico para prevenir forca bruta em API keys
router.get('/embed/:token', embedAuthLimiter, authController.embedAuth);

export default router;
