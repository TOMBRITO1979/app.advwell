import { Router } from 'express';
import clientMessageController from '../controllers/client-message.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Rotas para o Portal do Cliente
router.get('/client', clientMessageController.listForClient);
router.post('/client', clientMessageController.sendFromClient);

// Rotas para o Escritório
router.get('/office', clientMessageController.listForOffice);
router.post('/office', clientMessageController.sendFromOffice);
router.get('/office/unread-count', clientMessageController.countUnread);
router.put('/:messageId/read', clientMessageController.markAsRead);

export default router;
