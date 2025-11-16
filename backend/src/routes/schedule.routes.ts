import { Router } from 'express';
import scheduleController from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

// Aplicar middleware de autenticação e validação de tenant
router.use(authenticate, validateTenant);

// Rotas CRUD
router.get('/', scheduleController.list);
router.get('/upcoming', scheduleController.upcoming); // Próximos eventos (para dashboard)
router.get('/:id', scheduleController.get);
router.post('/', scheduleController.create);
router.put('/:id', scheduleController.update);
router.delete('/:id', scheduleController.delete);
router.patch('/:id/toggle-complete', scheduleController.toggleComplete);

export default router;
