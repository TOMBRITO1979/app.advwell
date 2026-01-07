import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import * as leadAnalyticsController from '../controllers/lead-analytics.controller';

const router = Router();

// Middleware de autenticação, rate limiting, tenant e permissão
// ADMIN/SUPER_ADMIN sempre tem acesso, USER precisa de permissão
router.use(authenticate, companyRateLimit, validateTenant, requirePermission('lead-analytics'));

// Endpoints de analytics
router.get('/stats', leadAnalyticsController.getStats);
router.get('/by-tags', leadAnalyticsController.getLeadsByTags);
router.get('/by-source', leadAnalyticsController.getLeadsBySource);
router.get('/conversion-timeline', leadAnalyticsController.getConversionTimeline);
router.get('/tag-effectiveness', leadAnalyticsController.getTagEffectiveness);

// Endpoints de exportação
router.get('/export/csv', leadAnalyticsController.exportCSV);
router.get('/export/pdf', leadAnalyticsController.exportPDF);

export default router;
