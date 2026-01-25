import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import telegramController from '../controllers/telegram.controller';

const router = Router();

// Webhook do Telegram (público - sem autenticação)
// Estas rotas DEVEM vir antes do middleware de autenticação

// Webhook do bot PADRÃO do sistema (deve vir ANTES da rota com :companyId)
router.post('/webhook/system', telegramController.systemWebhook);

// Webhook específico da empresa
router.post('/webhook/:companyId', telegramController.webhook);

// Aplicar autenticação e validação de tenant nas demais rotas
router.use(authenticate, validateTenant);

// Rotas de configuração do Telegram
router.get('/config', telegramController.getConfig);
router.post('/config', telegramController.saveConfig);
router.put('/toggle', telegramController.toggleActive);
router.post('/test', telegramController.testMessage);

export default router;
