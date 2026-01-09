import { Router } from 'express';
import lawyerController from '../controllers/lawyer.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e validação de tenant
router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Busca rápida para autocomplete (antes do :id para não conflitar)
router.get('/search', lawyerController.search);

// CRUD de advogados
router.get('/', lawyerController.list);
router.get('/:id', lawyerController.get);
router.post('/', lawyerController.create);
router.put('/:id', lawyerController.update);
router.delete('/:id', lawyerController.delete);

export default router;
