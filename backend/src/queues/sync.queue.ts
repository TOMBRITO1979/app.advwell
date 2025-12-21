import Queue from 'bull';
import prisma from '../utils/prisma';
import datajudService from '../services/datajud.service';
import { AIService } from '../services/ai/ai.service';

// Queue configuration
const syncQueue = new Queue('datajud-sync', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
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
  const data = new Date(ultimo.dataHora).toLocaleDateString('pt-BR');
  return `${ultimo.nome} - ${data}`;
}

// Process individual case sync
syncQueue.process('sync-case', 5, async (job) => {
  const { caseId, processNumber, companyId } = job.data;

  try {
    // Fetch data from DataJud
    const datajudData = await datajudService.searchCaseAllTribunals(processNumber);

    if (!datajudData?.movimentos) {
      return { success: false, message: 'Processo não encontrado no DataJud' };
    }

    // Delete old movements
    await prisma.caseMovement.deleteMany({
      where: { caseId },
    });

    // Create new movements
    if (datajudData.movimentos.length > 0) {
      await prisma.caseMovement.createMany({
        data: datajudData.movimentos.map((mov) => ({
          caseId,
          movementCode: mov.codigo,
          movementName: mov.nome,
          movementDate: new Date(mov.dataHora),
          description: mov.complementosTabelados
            ?.map((c) => `${c.nome}: ${c.descricao}`)
            .join('; '),
        })),
      });
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
        console.error(`AI summary error for case ${caseId}:`, aiError);
      }
    }

    return {
      success: true,
      processNumber,
      movementsCount: datajudData.movimentos.length,
    };
  } catch (error: any) {
    console.error(`Sync error for case ${caseId}:`, error);
    throw error; // Re-throw to trigger retry
  }
});

// Process batch sync (enqueues individual jobs)
syncQueue.process('sync-batch', async (job) => {
  const { companyId, batchSize = 100, offset = 0 } = job.data;

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
    console.error('Batch sync error:', error);
    throw error;
  }
});

// Event handlers for logging
syncQueue.on('completed', (job, result) => {
  if (job.name === 'sync-case') {
    console.log(`✓ Synced: ${result.processNumber} (${result.movementsCount} movements)`);
  }
});

syncQueue.on('failed', (job, err) => {
  console.error(`✗ Failed: ${job.name} - ${err.message}`);
});

syncQueue.on('stalled', (job) => {
  console.warn(`⚠ Stalled: ${job.name}`);
});

// Helper functions
// SEGURANCA: Sync diario agora itera por empresa para garantir isolamento de tenant
export const enqueueDailySync = async () => {
  console.log('Enqueueing daily sync...');

  // SEGURANCA: Buscar todas as empresas ativas com assinatura valida
  const activeCompanies = await prisma.company.findMany({
    where: {
      active: true,
      subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
    },
    select: { id: true, name: true },
  });

  console.log(`Found ${activeCompanies.length} active companies for daily sync`);

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
    console.log(`Enqueued sync for company: ${company.name}`);
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
