import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import announcementsController from '../controllers/announcements.controller';

const router = Router();

// Todas as rotas requerem autenticação e role ADMIN ou SUPER_ADMIN
router.use(authenticate, requireAdmin);

// CRUD de anúncios
router.get('/', announcementsController.list);
router.get('/:id', announcementsController.get);
router.post('/', announcementsController.create);
router.put('/:id', announcementsController.update);
router.delete('/:id', announcementsController.delete);
router.patch('/:id/toggle', announcementsController.toggle);

export default router;
