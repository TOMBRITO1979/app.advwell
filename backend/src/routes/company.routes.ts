import { Router } from 'express';
import companyController from '../controllers/company.controller';
import { authenticate, requireSuperAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Rotas do Admin (sua própria empresa) - DEVEM VIR ANTES DAS ROTAS COM :id
router.get('/own', requireAdmin, companyController.getOwn);
router.put('/own', requireAdmin, companyController.updateOwn);

// Rotas do Super Admin
router.get('/', requireSuperAdmin, companyController.list);
router.post('/', requireSuperAdmin, companyController.create);
router.put('/:id', requireSuperAdmin, companyController.update);
router.delete('/:id', requireSuperAdmin, companyController.delete);

export default router;
