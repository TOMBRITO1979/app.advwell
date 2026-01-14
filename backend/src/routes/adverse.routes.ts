import { Router } from 'express';
import multer from 'multer';
import adverseController from '../controllers/adverse.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

// Configurar multer para upload de CSV em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  },
});

const router = Router();

// Todas as rotas requerem autenticação, rate limit e validação de tenant
router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Busca rápida para autocomplete (antes do :id para não conflitar)
router.get('/search', adverseController.search);

// Export/Import routes (antes de /:id para não conflitar)
router.get('/export/csv', adverseController.exportCSV.bind(adverseController));
router.post('/import/csv', upload.single('file'), adverseController.importCSV.bind(adverseController));
router.get('/import/status/:jobId', adverseController.getImportStatusEndpoint.bind(adverseController));

// CRUD de adversos
router.get('/', adverseController.list);
router.get('/:id', adverseController.get);
router.post('/', adverseController.create);
router.put('/:id', adverseController.update);
router.delete('/:id', adverseController.delete);

export default router;
