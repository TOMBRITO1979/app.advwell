import { Router } from 'express';
import companyController from '../controllers/company.controller';
import { authenticate, requireSuperAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Rotas do Admin (sua própria empresa) - DEVEM VIR ANTES DAS ROTAS COM :id
router.get('/own', requireAdmin, companyController.getOwn);
router.put('/own', requireAdmin, companyController.updateOwn);
router.delete('/own', requireAdmin, companyController.deleteOwn);

// API Key Management (Para integrações WhatsApp, N8N, etc)
router.get('/own/api-key', requireAdmin, companyController.getApiKey);
router.post('/own/api-key/regenerate', requireAdmin, companyController.regenerateApiKey);

// Rotas do Super Admin
router.get('/subscription-alerts', requireSuperAdmin, companyController.getSubscriptionAlerts);
router.get('/', requireSuperAdmin, companyController.list);
router.post('/', requireSuperAdmin, companyController.create);
router.get('/:id/users', requireSuperAdmin, companyController.getUsers);
router.put('/:companyId/users/:userId/toggle-active', requireSuperAdmin, companyController.toggleUserActive);
router.put('/:id/subscription', requireSuperAdmin, companyController.updateSubscription);
router.get('/:id/last-payment', requireSuperAdmin, companyController.getCompanyLastPayment);
router.put('/:id', requireSuperAdmin, companyController.update);
router.delete('/:id', requireSuperAdmin, companyController.delete);

export default router;
