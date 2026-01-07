import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import * as leadAnalyticsController from '../controllers/lead-analytics.controller';

const router = Router();

// Middleware de autenticação e rate limiting
router.use(authenticate, companyRateLimit, validateTenant);

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
