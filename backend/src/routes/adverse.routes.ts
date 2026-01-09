import { Router } from 'express';
import adverseController from '../controllers/adverse.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e validação de tenant
router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Busca rápida para autocomplete (antes do :id para não conflitar)
router.get('/search', adverseController.search);

// CRUD de adversos
router.get('/', adverseController.list);
router.get('/:id', adverseController.get);
router.post('/', adverseController.create);
router.put('/:id', adverseController.update);
router.delete('/:id', adverseController.delete);

export default router;
