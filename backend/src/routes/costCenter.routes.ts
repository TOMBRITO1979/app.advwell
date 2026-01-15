import { Router } from 'express';
import * as costCenterController from '../controllers/costCenter.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List cost centers (all users)
router.get('/', costCenterController.list);

// Get cost center stats (all users)
router.get('/stats', costCenterController.getStats);

// Get single cost center (all users)
router.get('/:id', costCenterController.getById);

// Create cost center (ADMIN only)
router.post('/', requireRole('ADMIN', 'SUPER_ADMIN'), costCenterController.create);

// Update cost center (ADMIN only)
router.put('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), costCenterController.update);

// Delete cost center (ADMIN only)
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), costCenterController.remove);

export default router;
