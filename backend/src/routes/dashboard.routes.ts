import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import * as controller from '../controllers/dashboard.controller';

const router = Router();

// Aplicar middleware de autenticação e validação de tenant
router.use(authenticate, validateTenant);

// Rotas
router.get('/recent-activities', controller.getRecentActivities);

export default router;
