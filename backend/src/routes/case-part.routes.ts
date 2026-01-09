import { Router } from 'express';
import casePartController from '../controllers/case-part.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

router.use(authenticate, companyRateLimit, validateTenant);

// Rotas de partes do processo
router.get('/:caseId/parts', casePartController.list);
router.post('/:caseId/parts', casePartController.create);
router.put('/:caseId/parts/:partId', casePartController.update);
router.delete('/:caseId/parts/:partId', casePartController.delete);

// Rotas de testemunhas do processo
router.get('/:caseId/witnesses', casePartController.listWitnesses);
router.post('/:caseId/witnesses', casePartController.createWitness);
router.put('/:caseId/witnesses/:witnessId', casePartController.updateWitness);
router.delete('/:caseId/witnesses/:witnessId', casePartController.deleteWitness);

export default router;
