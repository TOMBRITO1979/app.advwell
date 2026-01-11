import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import deadLetterQueue, {
  getDeadLetterStats,
  getDeadLettersByCompany,
  getDeadLettersByQueue,
  cleanupOldDeadLetters,
  retryDeadLetter,
  DeadLetterJob,
} from '../queues/dead-letter.queue';
import syncQueue from '../queues/sync.queue';
import emailQueue from '../queues/email.queue';
import { appLogger } from '../utils/logger';

const router = Router();

// Todas as rotas requerem autenticação e role ADMIN ou SUPER_ADMIN
router.use(authenticate);

// Mapeamento de filas para retry
const queueMap: Record<string, any> = {
  'datajud-sync': syncQueue,
  'email-campaign': emailQueue,
};

/**
 * GET /api/admin/dead-letter/stats
 * Estatísticas da Dead Letter Queue
 * Somente ADMIN ou SUPER_ADMIN
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const stats = await getDeadLetterStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    appLogger.error('Error getting DLQ stats', error as Error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas da DLQ' });
  }
});

/**
 * GET /api/admin/dead-letter/jobs
 * Lista jobs na Dead Letter Queue
 * Query params: queue, limit
 * Somente ADMIN ou SUPER_ADMIN
 */
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { queue, limit = '100' } = req.query;
    const companyId = req.user!.companyId;

    let jobs;

    if (req.user!.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN pode ver todos os jobs
      if (queue) {
        jobs = await getDeadLettersByQueue(queue as string, parseInt(limit as string));
      } else {
        jobs = await deadLetterQueue.getJobs(['completed', 'waiting', 'active'], 0, parseInt(limit as string));
      }
    } else {
      // ADMIN só vê jobs da própria empresa
      jobs = await getDeadLettersByCompany(companyId!, parseInt(limit as string));
      if (queue) {
        jobs = jobs.filter((job) => (job.data as DeadLetterJob).originalQueue === queue);
      }
    }

    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      ...job.data,
    }));

    res.json({
      success: true,
      jobs: formattedJobs,
      total: formattedJobs.length,
    });
  } catch (error) {
    appLogger.error('Error listing DLQ jobs', error as Error);
    res.status(500).json({ error: 'Erro ao listar jobs da DLQ' });
  }
});

/**
 * POST /api/admin/dead-letter/retry/:jobId
 * Reenviar um job da DLQ para a fila original
 * Somente SUPER_ADMIN
 */
router.post('/retry/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Somente SUPER_ADMIN pode fazer retry de jobs' });
    }

    const { jobId } = req.params;

    // Buscar o job para descobrir a fila original
    const job = await deadLetterQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    const data = job.data as DeadLetterJob;
    const targetQueue = queueMap[data.originalQueue];

    if (!targetQueue) {
      return res.status(400).json({
        error: `Fila não suportada para retry: ${data.originalQueue}`,
      });
    }

    const success = await retryDeadLetter(jobId, targetQueue);

    if (success) {
      res.json({
        success: true,
        message: 'Job reenviado para a fila original',
        originalQueue: data.originalQueue,
        originalJobName: data.originalJobName,
      });
    } else {
      res.status(500).json({ error: 'Falha ao reenviar job' });
    }
  } catch (error) {
    appLogger.error('Error retrying DLQ job', error as Error);
    res.status(500).json({ error: 'Erro ao fazer retry do job' });
  }
});

/**
 * DELETE /api/admin/dead-letter/cleanup
 * Remove jobs antigos da DLQ
 * Somente SUPER_ADMIN
 */
router.delete('/cleanup', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Somente SUPER_ADMIN pode limpar a DLQ' });
    }

    const removed = await cleanupOldDeadLetters();

    res.json({
      success: true,
      message: `${removed} jobs removidos da DLQ`,
      removed,
    });
  } catch (error) {
    appLogger.error('Error cleaning up DLQ', error as Error);
    res.status(500).json({ error: 'Erro ao limpar DLQ' });
  }
});

/**
 * DELETE /api/admin/dead-letter/jobs/:jobId
 * Remove um job específico da DLQ
 * Somente SUPER_ADMIN
 */
router.delete('/jobs/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Somente SUPER_ADMIN pode remover jobs da DLQ' });
    }

    const { jobId } = req.params;
    const job = await deadLetterQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    await job.remove();

    res.json({
      success: true,
      message: 'Job removido da DLQ',
      jobId,
    });
  } catch (error) {
    appLogger.error('Error removing DLQ job', error as Error);
    res.status(500).json({ error: 'Erro ao remover job da DLQ' });
  }
});

export default router;
