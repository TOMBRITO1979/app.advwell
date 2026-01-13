import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { companyRateLimit } from '../middleware/company-rate-limit';
import { monitoringController } from '../controllers/monitoring.controller';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(companyRateLimit);

// ========================================
// OABs MONITORADAS
// ========================================

// Listar OABs monitoradas
router.get('/oabs', (req, res) => monitoringController.listMonitoredOabs(req, res));

// Criar nova OAB monitorada
router.post('/oabs', (req, res) => monitoringController.createMonitoredOab(req, res));

// Atualizar OAB monitorada
router.put('/oabs/:id', (req, res) => monitoringController.updateMonitoredOab(req, res));

// Deletar OAB monitorada
router.delete('/oabs/:id', (req, res) => monitoringController.deleteMonitoredOab(req, res));

// Buscar manualmente publicações de uma OAB (enfileira consulta dos últimos 5 anos)
router.post('/oabs/:id/refresh', (req, res) => monitoringController.refreshOab(req, res));

// ========================================
// CONSULTAS
// ========================================

// Listar consultas
router.get('/consultas', (req, res) => monitoringController.listConsultas(req, res));

// Iniciar nova consulta (enfileirada)
router.post('/consultas', (req, res) => monitoringController.iniciarConsulta(req, res));

// Obter status em tempo real de uma consulta
router.get('/consultas/:id/status', (req, res) => monitoringController.getConsultaStatus(req, res));

// ========================================
// FILA
// ========================================

// Estatísticas da fila de processamento
router.get('/queue/stats', (req, res) => monitoringController.getQueueStats(req, res));

// ========================================
// PUBLICAÇÕES
// ========================================

// Listar publicações
router.get('/publications', (req, res) => monitoringController.listPublications(req, res));

// Importar publicação como processo (legado - cria cliente automaticamente)
router.post('/publications/:id/import', (req, res) => monitoringController.importPublication(req, res));

// Marcar publicação como importada (usado quando processo é criado manualmente)
router.patch('/publications/:id/mark-imported', (req, res) => monitoringController.markPublicationImported(req, res));

// ========================================
// STATS
// ========================================

// Estatísticas do dashboard
router.get('/stats', (req, res) => monitoringController.getStats(req, res));

export default router;
