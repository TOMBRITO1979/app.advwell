import { Router } from 'express';
import whatsappWebhookController from '../controllers/whatsapp-webhook.controller';

const router = Router();

/**
 * Rotas de Webhook do WhatsApp Business API
 *
 * IMPORTANTE: Estas rotas NÃO usam autenticação JWT
 * A verificação é feita pelo token configurado no webhook
 *
 * Configuração no Meta Business:
 * 1. Acesse developers.facebook.com
 * 2. Vá em WhatsApp > Configuration > Webhook
 * 3. Configure a URL: https://api.advwell.pro/api/whatsapp-webhook
 * 4. Use o Verify Token configurado na empresa
 * 5. Assine os campos: messages, message_status_updates
 */

// GET - Verificação do webhook pela Meta
// A Meta envia uma requisição GET para verificar o endpoint
router.get('/', whatsappWebhookController.verify);

// POST - Recebe notificações de status e mensagens
// A Meta envia POSTs com updates de delivered, read, failed, etc.
router.post('/', whatsappWebhookController.receive);

// GET - Status do webhook (para debug/monitoramento)
// Protegido apenas por não ser documentado publicamente
router.get('/status', whatsappWebhookController.status);

export default router;
