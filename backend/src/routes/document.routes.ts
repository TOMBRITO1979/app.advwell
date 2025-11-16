import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { upload } from '../middleware/upload';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  uploadDocument,
  getDownloadUrl,
} from '../controllers/document.controller';

const router = Router();

// Aplicar autenticação e validação de tenant em todas as rotas
router.use(authenticate, validateTenant);

// Rotas de documentos
router.get('/', listDocuments);                              // Listar documentos com filtros
router.get('/search', searchDocuments);                      // Buscar por cliente ou processo
router.post('/upload', upload.single('file'), uploadDocument); // Upload de arquivo para S3
router.get('/:id/download', getDownloadUrl);                 // Gerar URL de download
router.get('/:id', getDocument);                             // Buscar documento por ID
router.post('/', createDocument);                            // Criar novo documento (link externo)
router.put('/:id', updateDocument);                          // Atualizar documento
router.delete('/:id', deleteDocument);                       // Excluir documento

export default router;
