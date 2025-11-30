import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import * as controller from '../controllers/dashboard.controller';

const router = Router();

// Aplicar middleware de autenticação e validação de tenant
router.use(authenticate, validateTenant);

// Rotas
router.get('/stats', controller.getStats);
router.get('/recent-activities', controller.getRecentActivities);

// Rotas de gráficos/estatísticas
router.get('/events-per-weekday', controller.getEventsPerWeekday);
router.get('/cases-by-status', controller.getCasesByStatus);
router.get('/movements-timeline', controller.getMovementsTimeline);
router.get('/upcoming-deadlines', controller.getUpcomingDeadlines);
router.get('/new-clients-timeline', controller.getNewClientsTimeline);
router.get('/upcoming-hearings', controller.getUpcomingHearings);

export default router;
