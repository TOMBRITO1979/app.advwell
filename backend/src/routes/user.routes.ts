import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import userController from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { profilePhotoUpload, validateUploadContent } from '../middleware/upload';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

router.use(authenticate);
router.use(companyRateLimit);

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
    .isLength({ min: 12, max: 100 })
    .withMessage('Senha deve ter entre 12 e 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~])/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%^&*...)'),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role deve ser USER, ADMIN ou SUPER_ADMIN'),
];

// Validações para atualização de usuário
const updateUserValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\.\-\']+$/)
    .withMessage('Nome deve conter apenas letras, números, espaços e caracteres comuns'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 12, max: 100 })
    .withMessage('Senha deve ter entre 12 e 100 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~])/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%^&*...)'),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Role deve ser USER, ADMIN ou SUPER_ADMIN'),
];

// Rotas de perfil (não requerem admin, apenas autenticação)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/photo', profilePhotoUpload.single('photo'), validateUploadContent, userController.uploadProfilePhoto);

// Rotas administrativas (requerem admin)
router.use(requireAdmin);
router.use(validateTenant);

router.get('/', userController.list);
router.post('/', createUserValidation, validate, userController.create);
router.put('/:id', updateUserValidation, validate, userController.update);
router.delete('/:id', userController.delete);

export default router;
