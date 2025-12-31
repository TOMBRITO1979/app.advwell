import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireClient } from '../middleware/clientAuth';
import portalController from '../controllers/portal.controller';

const router = Router();

// Todas as rotas do portal requerem autenticação + validação de cliente
router.use(authenticate, requireClient);

// Dashboard
router.get('/dashboard', portalController.getDashboard);

// Perfil do cliente
router.get('/profile', portalController.getProfile);

// Dados do escritório
router.get('/company', portalController.getCompany);

// Processos
router.get('/cases', portalController.getCases);
router.get('/cases/:id', portalController.getCaseDetails);
router.get('/cases/:id/movements', portalController.getCaseMovements);

// Anúncios
router.get('/announcements', portalController.getAnnouncements);

export default router;
