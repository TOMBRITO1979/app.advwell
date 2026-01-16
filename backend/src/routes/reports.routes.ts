import { Router } from 'express';
import reportsController from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Relatório avançado de processos (fase, rito, prazo, advogado, sem movimento 180 dias)
router.get('/cases/advanced', reportsController.getCaseAdvancedReport);

// Relatório de PNJ com top adversos e processos sem movimento
router.get('/pnj/adverses', reportsController.getPnjAdversesReport);

export default router;
