import Queue from 'bull';
import prisma from '../utils/prisma';
import datajudService from '../services/datajud.service';
import { AIService } from '../services/ai/ai.service';
import { createRedisClient } from '../utils/redis';
import { appLogger } from '../utils/logger';
import { moveToDeadLetter } from './dead-letter.queue';

// ESCALABILIDADE: Parametros configuráveis via ambiente
const SYNC_CONCURRENCY = parseInt(process.env.SYNC_CONCURRENCY || '5');
const SYNC_BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '50');
const SYNC_INCREMENTAL = process.env.SYNC_INCREMENTAL !== 'false'; // Default: true
// ISSUE 1 FIX: Controle de processadores para evitar duplicação em múltiplas replicas
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false'; // Default: true

appLogger.info('Sync Queue config', {
  concurrency: SYNC_CONCURRENCY,
  batch: SYNC_BATCH_SIZE,
  incremental: SYNC_INCREMENTAL,
  processorsEnabled: ENABLE_QUEUE_PROCESSORS
});

// TAREFA 4.1: Queue configuration usando createRedisClient (suporta Sentinel)
const syncQueue = new Queue('datajud-sync', {
  createClient: (type) => {
    // Bull requer clients separados para subscriber e client
    return createRedisClient();
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Helper function to get ultimo andamento
function getUltimoAndamento(movimentos: any[]): string | null {
  if (!movimentos || movimentos.length === 0) return null;

  const sorted = [...movimentos].sort((a, b) =>
    new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );

  const ultimo = sorted[0];
  const data = new Date(ultimo.dataHora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `${ultimo.nome} - ${data}`;
}

// ESCALABILIDADE: Gerar hash unico para movimento (para detecção de duplicatas)
function generateMovementHash(caseId: string, codigo: number, dataHora: string): string {
  return `${caseId}-${codigo}-${new Date(dataHora).getTime()}`;
}

// ISSUE 1 FIX: Só registrar processadores se habilitado (evita jobs duplicados em múltiplas replicas)
if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Registering sync queue processors...');

// Process individual case sync
syncQueue.process('sync-case', SYNC_CONCURRENCY, async (job) => {
  const { caseId, processNumber, companyId } = job.data;

  try {
    // Fetch data from DataJud
    const datajudData = await datajudService.searchCaseAllTribunals(processNumber);

    if (!datajudData?.movimentos) {
      return { success: false, message: 'Processo não encontrado no DataJud' };
    }

    let syncedCount = 0;
    let skippedCount = 0;

    if (SYNC_INCREMENTAL) {
      // ESCALABILIDADE: Sync incremental - upsert em vez de delete all
      // Buscar movimentos existentes
      const existingMovements = await prisma.caseMovement.findMany({
        where: { caseId },
        select: { movementCode: true, movementDate: true },
      });

      // Criar set de hashes existentes para lookup rapido
      const existingHashes = new Set(
        existingMovements.map(m => `${caseId}-${m.movementCode}-${m.movementDate.getTime()}`)
      );

      // Filtrar apenas movimentos novos
      const newMovements = datajudData.movimentos.filter((mov) => {
        const hash = generateMovementHash(caseId, mov.codigo, mov.dataHora);
        return !existingHashes.has(hash);
      });

      skippedCount = datajudData.movimentos.length - newMovements.length;

      // Inserir apenas novos movimentos
      if (newMovements.length > 0) {
        await prisma.caseMovement.createMany({
          data: newMovements.map((mov) => ({
            caseId,
            companyId, // TAREFA 4.3: Isolamento de tenant direto
            movementCode: mov.codigo,
            movementName: mov.nome,
            movementDate: new Date(mov.dataHora),
            description: mov.complementosTabelados
              ?.map((c) => `${c.nome}: ${c.descricao}`)
              .join('; '),
          })),
          skipDuplicates: true, // Ignorar se houver conflito
        });
        syncedCount = newMovements.length;
      }
    } else {
      // Modo legado: delete all + create
      await prisma.caseMovement.deleteMany({
        where: { caseId },
      });

      if (datajudData.movimentos.length > 0) {
        await prisma.caseMovement.createMany({
          data: datajudData.movimentos.map((mov) => ({
            caseId,
            companyId, // TAREFA 4.3: Isolamento de tenant direto
            movementCode: mov.codigo,
            movementName: mov.nome,
            movementDate: new Date(mov.dataHora),
            description: mov.complementosTabelados
              ?.map((c) => `${c.nome}: ${c.descricao}`)
              .join('; '),
          })),
        });
        syncedCount = datajudData.movimentos.length;
      }
    }

    // Get ultimo andamento
    const ultimoAndamento = getUltimoAndamento(datajudData.movimentos);

    // Update case
    await prisma.case.update({
      where: { id: caseId },
      data: {
        lastSyncedAt: new Date(),
        ultimoAndamento,
      },
    });

    // Generate AI summary if configured
    if (companyId) {
      try {
        const aiConfig = await prisma.aIConfig.findUnique({
          where: { companyId },
        });

        if (aiConfig?.enabled && aiConfig?.autoSummarize) {
          const result = await AIService.generateCaseSummary(caseId, companyId);
          if (result.success && result.summary) {
            await prisma.case.update({
              where: { id: caseId },
              data: { informarCliente: result.summary },
            });
          }
        }
      } catch (aiError) {
        appLogger.error('AI summary error for case', aiError as Error, { caseId });
      }
    }

    return {
      success: true,
      processNumber,
      movementsCount: datajudData.movimentos.length,
      syncedCount,
      skippedCount,
      incremental: SYNC_INCREMENTAL,
    };
  } catch (error: any) {
    appLogger.error('Sync error for case', error as Error, { caseId });
    throw error; // Re-throw to trigger retry
  }
});

// Process batch sync (enqueues individual jobs)
syncQueue.process('sync-batch', async (job) => {
  // ESCALABILIDADE: Usar SYNC_BATCH_SIZE como default
  const { companyId, batchSize = SYNC_BATCH_SIZE, offset = 0 } = job.data;

  try {
    const whereClause: any = { status: 'ACTIVE' };
    if (companyId) {
      whereClause.companyId = companyId;
    }

    // Get cases to sync
    const cases = await prisma.case.findMany({
      where: whereClause,
      select: {
        id: true,
        processNumber: true,
        companyId: true,
      },
      skip: offset,
      take: batchSize,
      orderBy: { lastSyncedAt: 'asc' }, // Prioritize oldest synced
    });

    if (cases.length === 0) {
      return { success: true, message: 'No more cases to sync', enqueued: 0 };
    }

    // Enqueue individual sync jobs
    const jobs = cases.map((c) =>
      syncQueue.add(
        'sync-case',
        {
          caseId: c.id,
          processNumber: c.processNumber,
          companyId: c.companyId,
        },
        {
          jobId: `sync-${c.id}-${Date.now()}`,
          delay: Math.random() * 2000, // Random delay to avoid rate limiting
        }
      )
    );

    await Promise.all(jobs);

    // Schedule next batch if there are more cases
    const totalCases = await prisma.case.count({ where: whereClause });
    if (offset + batchSize < totalCases) {
      await syncQueue.add(
        'sync-batch',
        {
          companyId,
          batchSize,
          offset: offset + batchSize,
        },
        {
          delay: 60000, // Wait 1 minute before next batch
        }
      );
    }

    return {
      success: true,
      enqueued: cases.length,
      offset,
      total: totalCases,
    };
  } catch (error: any) {
    appLogger.error('Batch sync error', error as Error);
    throw error;
  }
});

// Event handlers for logging
syncQueue.on('completed', (job, result) => {
  if (job.name === 'sync-case') {
    appLogger.info('Synced case', { processNumber: result.processNumber, movementsCount: result.movementsCount });
  }
});

syncQueue.on('failed', async (job, err) => {
  appLogger.error('Job failed', err as Error, { jobName: job.name });

  // Move para Dead Letter Queue se excedeu todas as tentativas
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await moveToDeadLetter('datajud-sync', job, err);
  }
});

syncQueue.on('stalled', (job) => {
  appLogger.warn('Job stalled', { jobName: job.name });
});

} else {
  appLogger.info('Sync queue processors DISABLED (ENABLE_QUEUE_PROCESSORS=false)');
}

// Helper functions
// SEGURANCA: Sync diario agora itera por empresa para garantir isolamento de tenant
export const enqueueDailySync = async () => {
  appLogger.info('Enqueueing daily sync...');

  // SEGURANCA: Buscar todas as empresas ativas com assinatura valida
  const activeCompanies = await prisma.company.findMany({
    where: {
      active: true,
      subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
    },
    select: { id: true, name: true },
  });

  appLogger.info('Found active companies for daily sync', { count: activeCompanies.length });

  // Enfileirar sync para cada empresa separadamente
  for (const company of activeCompanies) {
    await syncQueue.add(
      'sync-batch',
      {
        companyId: company.id, // SEGURANCA: Sempre especificar companyId
        batchSize: 50,
        offset: 0,
      },
      {
        jobId: `daily-sync-${company.id}-${Date.now()}`,
        delay: Math.random() * 5000, // Delay aleatorio para distribuir carga
      }
    );
    appLogger.info('Enqueued sync for company', { companyId: company.id, companyName: company.name });
  }
};

export const enqueueCaseSync = async (caseId: string, processNumber: string, companyId: string) => {
  await syncQueue.add(
    'sync-case',
    { caseId, processNumber, companyId },
    { jobId: `manual-sync-${caseId}-${Date.now()}` }
  );
};

export const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    syncQueue.getWaitingCount(),
    syncQueue.getActiveCount(),
    syncQueue.getCompletedCount(),
    syncQueue.getFailedCount(),
    syncQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

export default syncQueue;
