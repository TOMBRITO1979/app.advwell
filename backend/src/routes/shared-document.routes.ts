import { Router } from 'express';
import sharedDocumentController from '../controllers/shared-document.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas para documentos compartilhados (admin/advogado)

// GET /api/clients/:clientId/shared-documents - Listar documentos de um cliente
router.get('/clients/:clientId/shared-documents', sharedDocumentController.listByClient);

// POST /api/clients/:clientId/shared-documents - Compartilhar documento com cliente (upload)
router.post(
  '/clients/:clientId/shared-documents',
  upload.single('file'),
  sharedDocumentController.share
);

// POST /api/clients/:clientId/shared-documents/from-existing - Compartilhar documento existente
router.post(
  '/clients/:clientId/shared-documents/from-existing',
  sharedDocumentController.shareFromExisting
);

// POST /api/clients/:clientId/shared-documents/from-legal - Compartilhar documento jurídico (gera PDF)
router.post(
  '/clients/:clientId/shared-documents/from-legal',
  sharedDocumentController.shareFromLegal
);

// GET /api/shared-documents/:id - Buscar documento por ID
router.get('/shared-documents/:id', sharedDocumentController.getById);

// PUT /api/shared-documents/:id - Atualizar documento
router.put('/shared-documents/:id', sharedDocumentController.update);

// DELETE /api/shared-documents/:id - Excluir documento
router.delete('/shared-documents/:id', sharedDocumentController.delete);

export default router;
