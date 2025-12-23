import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import * as auditLogController from '../controllers/audit-log.controller';

const router = Router();

// Todas as rotas requerem autenticação, rate limit e validação de tenant
router.use(authenticate, companyRateLimit, validateTenant);

// Lista logs (admin: todos, user: próprios)
router.get('/', auditLogController.list);

// Lista apenas meus logs
router.get('/my', auditLogController.getMyLogs);

// Lista usuários para filtro (apenas admin)
router.get('/users', auditLogController.getUsersForFilter);

// Exporta logs em CSV
router.get('/export/csv', auditLogController.exportCSV);

// Lista logs de uma entidade específica
router.get('/:type/:entityId', auditLogController.getByEntity);

export default router;
