import { Router } from 'express';
import multer from 'multer';
import lawyerController from '../controllers/lawyer.controller';
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
router.get('/search', lawyerController.search);

// Export/Import routes (antes de /:id para não conflitar)
router.get('/export/csv', lawyerController.exportCSV.bind(lawyerController));
router.post('/import/csv', upload.single('file'), lawyerController.importCSV.bind(lawyerController));
router.get('/import/status/:jobId', lawyerController.getImportStatusEndpoint.bind(lawyerController));

// CRUD de advogados
router.get('/', lawyerController.list);
router.get('/:id', lawyerController.get);
router.post('/', lawyerController.create);
router.put('/:id', lawyerController.update);
router.delete('/:id', lawyerController.delete);

export default router;
