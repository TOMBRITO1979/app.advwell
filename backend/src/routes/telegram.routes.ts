import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import telegramController from '../controllers/telegram.controller';

const router = Router();

// Aplicar autenticação e validação de tenant
router.use(authenticate, validateTenant);

// Rotas de configuração do Telegram
router.get('/config', telegramController.getConfig);
router.post('/config', telegramController.saveConfig);
router.put('/toggle', telegramController.toggleActive);
router.post('/test', telegramController.testMessage);

export default router;
