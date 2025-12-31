import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import googleCalendarController from '../controllers/google-calendar.controller';

const router = Router();

// Rotas públicas (sem autenticação)
router.get('/callback', googleCalendarController.handleCallback);

// Rotas protegidas (requerem autenticação)
router.get('/configured', authenticate, googleCalendarController.isConfigured);
router.get('/status', authenticate, googleCalendarController.getStatus);
router.get('/auth-url', authenticate, googleCalendarController.getAuthUrl);
router.post('/disconnect', authenticate, googleCalendarController.disconnect);
router.put('/settings', authenticate, googleCalendarController.updateSettings);

export default router;
