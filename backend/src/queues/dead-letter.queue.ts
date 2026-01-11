import Queue, { Job, Queue as BullQueue } from 'bull';
import { createRedisClient } from '../utils/redis';
import { appLogger } from '../utils/logger';

// ISSUE: Dead Letter Queue para jobs falhados
// Permite investigação e retry manual de jobs que falharam após todas as tentativas

const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

// Configuração do DLQ
const DLQ_RETENTION_DAYS = parseInt(process.env.DLQ_RETENTION_DAYS || '30');
const DLQ_MAX_JOBS = parseInt(process.env.DLQ_MAX_JOBS || '10000');

export interface DeadLetterJob {
  originalQueue: string;
  originalJobName: string;
  originalJobId: string;
  data: any;
  failedReason: string;
  attemptsMade: number;
  stacktrace: string[];
  failedAt: Date;
  companyId?: string;
}

// Criar Dead Letter Queue
const deadLetterQueue = new Queue('dead-letter', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    removeOnComplete: DLQ_MAX_JOBS, // Manter últimos N jobs
    removeOnFail: false, // Nunca remover jobs falhados automaticamente
  },
});

/**
 * Move um job falhado para a Dead Letter Queue
 */
export async function moveToDeadLetter(
  originalQueue: string,
  job: Job,
  error: Error
): Promise<void> {
  const deadLetterData: DeadLetterJob = {
    originalQueue,
    originalJobName: job.name || 'unknown',
    originalJobId: job.id?.toString() || 'unknown',
    data: job.data,
    failedReason: error.message,
    attemptsMade: job.attemptsMade || 0,
    stacktrace: job.stacktrace || [],
    failedAt: new Date(),
    companyId: job.data?.companyId,
  };

  await deadLetterQueue.add('failed-job', deadLetterData, {
    jobId: `dlq-${originalQueue}-${job.id}-${Date.now()}`,
  });

  appLogger.warn('Job moved to Dead Letter Queue', {
    originalQueue,
    jobName: job.name,
    jobId: job.id,
    reason: error.message,
    companyId: job.data?.companyId,
  });
}

/**
 * Busca jobs na DLQ por companyId
 */
export async function getDeadLettersByCompany(companyId: string, limit = 100): Promise<Job[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'waiting', 'active'], 0, limit);
  return jobs.filter((job) => job.data?.companyId === companyId);
}

/**
 * Busca jobs na DLQ por fila de origem
 */
export async function getDeadLettersByQueue(queueName: string, limit = 100): Promise<Job[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'waiting', 'active'], 0, limit);
  return jobs.filter((job) => job.data?.originalQueue === queueName);
}

/**
 * Estatísticas da DLQ
 */
export async function getDeadLetterStats(): Promise<{
  total: number;
  byQueue: Record<string, number>;
  byCompany: Record<string, number>;
  oldest?: Date;
  newest?: Date;
}> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'waiting', 'active'], 0, DLQ_MAX_JOBS);

  const byQueue: Record<string, number> = {};
  const byCompany: Record<string, number> = {};
  let oldest: Date | undefined;
  let newest: Date | undefined;

  for (const job of jobs) {
    const data = job.data as DeadLetterJob;

    // Contar por fila
    byQueue[data.originalQueue] = (byQueue[data.originalQueue] || 0) + 1;

    // Contar por empresa
    if (data.companyId) {
      byCompany[data.companyId] = (byCompany[data.companyId] || 0) + 1;
    }

    // Encontrar mais antigo e mais novo
    const failedAt = new Date(data.failedAt);
    if (!oldest || failedAt < oldest) oldest = failedAt;
    if (!newest || failedAt > newest) newest = failedAt;
  }

  return {
    total: jobs.length,
    byQueue,
    byCompany,
    oldest,
    newest,
  };
}

/**
 * Remove jobs antigos da DLQ (cleanup)
 */
export async function cleanupOldDeadLetters(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DLQ_RETENTION_DAYS);

  const jobs = await deadLetterQueue.getJobs(['completed', 'waiting'], 0, DLQ_MAX_JOBS);
  let removedCount = 0;

  for (const job of jobs) {
    const data = job.data as DeadLetterJob;
    if (new Date(data.failedAt) < cutoffDate) {
      await job.remove();
      removedCount++;
    }
  }

  if (removedCount > 0) {
    appLogger.info('Cleaned up old Dead Letter jobs', {
      removed: removedCount,
      retentionDays: DLQ_RETENTION_DAYS,
    });
  }

  return removedCount;
}

/**
 * Retry um job da DLQ (reenviar para a fila original)
 */
export async function retryDeadLetter(
  jobId: string,
  targetQueue: BullQueue
): Promise<boolean> {
  const job = await deadLetterQueue.getJob(jobId);
  if (!job) {
    appLogger.warn('Dead Letter job not found', { jobId });
    return false;
  }

  const data = job.data as DeadLetterJob;

  // Re-enfileirar na fila original
  await targetQueue.add(data.originalJobName, data.data, {
    jobId: `retry-${data.originalJobId}-${Date.now()}`,
    attempts: 3, // Reset attempts
  });

  // Remover da DLQ
  await job.remove();

  appLogger.info('Dead Letter job retried', {
    jobId,
    originalQueue: data.originalQueue,
    originalJobName: data.originalJobName,
  });

  return true;
}

// Processador apenas para logging (se habilitado)
if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Dead Letter Queue initialized', {
    retentionDays: DLQ_RETENTION_DAYS,
    maxJobs: DLQ_MAX_JOBS,
  });

  // Handler para novos jobs na DLQ
  deadLetterQueue.on('completed', (job) => {
    const data = job.data as DeadLetterJob;
    appLogger.debug('Dead Letter job stored', {
      originalQueue: data.originalQueue,
      jobName: data.originalJobName,
      companyId: data.companyId,
    });
  });
}

export default deadLetterQueue;
