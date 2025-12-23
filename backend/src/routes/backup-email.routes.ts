import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import backupEmailController from '../controllers/backup-email.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit, tenant e ADMIN
router.use(authenticate, companyRateLimit, validateTenant, requireAdmin);

// Validação do email
const backupEmailValidation = [
  body('backupEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido'),
];

// Rotas
router.get('/', backupEmailController.get);
router.put('/', backupEmailValidation, backupEmailController.update);
router.post('/test', backupEmailController.sendTest);

export default router;
