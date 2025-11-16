import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import userController from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);
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

// Validações para criação de usuário
const createUserValidation = [
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
  body('role')
    .optional()
    .isIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role deve ser USER, ADMIN ou SUPER_ADMIN'),
];

// Validações para atualização de usuário
const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\.\-\']+$/)
    .withMessage('Nome deve conter apenas letras, números, espaços e caracteres comuns'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .optional()
    .isLength({ min: 6, max: 100 })
    .withMessage('Senha deve ter entre 6 e 100 caracteres'),
  body('role')
    .optional()
    .isIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role deve ser USER, ADMIN ou SUPER_ADMIN'),
];

router.get('/', userController.list);
router.post('/', createUserValidation, validate, userController.create);
router.put('/:id', updateUserValidation, validate, userController.update);
router.delete('/:id', userController.delete);

export default router;
