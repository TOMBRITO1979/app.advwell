import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import {
  listProvidedShares,
  getReceivedShare,
  createShare,
  updateShare,
  deleteShare,
  getAvailableClients,
  getShareStats,
} from '../controllers/ai-token-share.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Route for clients to check their received share (doesn't require SUPER_ADMIN)
router.get('/received', validateTenant, getReceivedShare);

// All other routes require SUPER_ADMIN
router.get('/provider/:companyId', requireRole('SUPER_ADMIN'), listProvidedShares);
router.get('/provider/:providerCompanyId/available-clients', requireRole('SUPER_ADMIN'), getAvailableClients);
router.get('/:id/stats', requireRole('SUPER_ADMIN'), getShareStats);
router.post('/', requireRole('SUPER_ADMIN'), createShare);
router.put('/:id', requireRole('SUPER_ADMIN'), updateShare);
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteShare);

export default router;
