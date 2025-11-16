import { Router } from 'express';
import casePartController from '../controllers/case-part.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

router.use(authenticate, validateTenant);

// Rotas de partes do processo
router.get('/:caseId/parts', casePartController.list);
router.post('/:caseId/parts', casePartController.create);
router.put('/:caseId/parts/:partId', casePartController.update);
router.delete('/:caseId/parts/:partId', casePartController.delete);

export default router;
