import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireClient } from '../middleware/clientAuth';
import portalController from '../controllers/portal.controller';
import { upload } from '../middleware/upload';

const router = Router();

// Todas as rotas do portal requerem autenticação + validação de cliente
router.use(authenticate, requireClient);

// Dashboard
router.get('/dashboard', portalController.getDashboard);

// Perfil do cliente
router.get('/profile', portalController.getProfile);

// Dados do escritório
router.get('/company', portalController.getCompany);

// Processos Judiciais
router.get('/cases', portalController.getCases);
router.get('/cases/:id', portalController.getCaseDetails);
router.get('/cases/:id/movements', portalController.getCaseMovements);

// Processos Não Judiciais (PNJ)
router.get('/pnjs', portalController.getPNJs);
router.get('/pnjs/:id', portalController.getPNJDetails);
router.get('/pnjs/:id/movements', portalController.getPNJMovements);

// Anúncios
router.get('/announcements', portalController.getAnnouncements);

// Documentos Compartilhados
router.get('/documents', portalController.getDocuments);
router.get('/documents/:id', portalController.getDocumentDetails);
router.post('/documents/:id/download', portalController.downloadDocument);
router.post('/documents/:id/sign', portalController.signDocument);
router.post('/documents/upload', upload.single('file'), portalController.uploadDocument);

// Solicitações de Documentos
router.get('/document-requests', portalController.getDocumentRequests);
router.post('/document-requests/:id/submit', upload.single('file'), portalController.submitDocumentRequest);

export default router;
