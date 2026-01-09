import Queue from 'bull';
import prisma from '../utils/prisma';
import { createRedisClient, redis } from '../utils/redis';
import { appLogger } from '../utils/logger';
import { getAdvApiService } from '../services/advapi.service';

// ESCALABILIDADE: Configuração via ambiente
const MONITORING_CONCURRENCY = parseInt(process.env.MONITORING_CONCURRENCY || '3');
const MONITORING_BATCH_SIZE = parseInt(process.env.MONITORING_BATCH_SIZE || '100');
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

appLogger.info('Monitoring Queue config', {
  concurrency: MONITORING_CONCURRENCY,
  batchSize: MONITORING_BATCH_SIZE,
  processorsEnabled: ENABLE_QUEUE_PROCESSORS,
});

// Interface para status da consulta
interface MonitoringConsultaStatus {
  status: 'pending' | 'processing' | 'fetching' | 'saving' | 'completed' | 'failed';
  progress: number;
  totalPublications: number;
  savedCount: number;
  importedCount: number;
  currentPage: number;
  totalPages: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

// Configuração da fila usando createRedisClient (suporta Sentinel)
const monitoringQueue = new Queue('oab-monitoring', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000, // 10 segundos entre retentativas
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Helper para atualizar status no Redis
async function updateConsultaStatus(consultaId: string, status: Partial<MonitoringConsultaStatus>): Promise<void> {
  const key = `monitoring:${consultaId}:status`;
  const current = await redis.get(key);
  const parsed = current ? JSON.parse(current) : {};
  await redis.setex(key, 86400 * 7, JSON.stringify({ ...parsed, ...status })); // TTL 7 dias
}

// Helper para buscar status
export async function getConsultaQueueStatus(consultaId: string): Promise<MonitoringConsultaStatus | null> {
  const key = `monitoring:${consultaId}:status`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Enfileirar nova consulta de OAB
export async function enqueueOabConsulta(
  consultaId: string,
  monitoredOabId: string,
  companyId: string,
  advogadoNome: string,
  advogadoOab: string,
  ufOab: string,
  dataInicio: string,
  dataFim: string,
  tribunais: string[] = [],
  autoImport: boolean = false
): Promise<string> {
  const jobId = `consulta-${consultaId}-${Date.now()}`;

  // Inicializar status
  await updateConsultaStatus(consultaId, {
    status: 'pending',
    progress: 0,
    totalPublications: 0,
    savedCount: 0,
    importedCount: 0,
    currentPage: 0,
    totalPages: 0,
  });

  // Enfileirar job
  await monitoringQueue.add(
    'process-consulta',
    {
      jobId,
      consultaId,
      monitoredOabId,
      companyId,
      advogadoNome,
      advogadoOab,
      ufOab,
      dataInicio,
      dataFim,
      tribunais,
      autoImport,
    },
    {
      jobId,
      delay: 1000, // Pequeno delay para garantir que o registro foi salvo
    }
  );

  appLogger.info('OAB consulta enqueued', {
    jobId,
    consultaId,
    advogadoOab,
    ufOab,
  });

  return jobId;
}

// ============================================================================
// PROCESSADORES
// ============================================================================

if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Registering monitoring queue processors...');

  // Processador principal de consultas
  monitoringQueue.process('process-consulta', MONITORING_CONCURRENCY, async (job) => {
    const {
      consultaId,
      monitoredOabId,
      companyId,
      advogadoNome,
      advogadoOab,
      ufOab,
      dataInicio,
      dataFim,
      tribunais,
      autoImport,
    } = job.data;

    try {
      await updateConsultaStatus(consultaId, {
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      // Atualizar registro no banco
      await prisma.oABConsulta.update({
        where: { id: consultaId },
        data: { status: 'PROCESSING' },
      });

      // Iniciar consulta na ADVAPI
      const advApiService = getAdvApiService();

      appLogger.info('Starting ADVAPI consulta', {
        consultaId,
        advogadoOab,
        ufOab,
        dataInicio,
        dataFim,
      });

      const response = await advApiService.iniciarConsulta({
        companyId,
        advogadoNome,
        advogadoOab,
        ufOab,
        tribunais,
        dataInicio,
        dataFim,
      });

      if (!response.success) {
        throw new Error(response.error || 'Erro ao iniciar consulta na ADVAPI');
      }

      const advApiConsultaId = response.consultaId;

      // Atualizar com ID da ADVAPI
      await prisma.oABConsulta.update({
        where: { id: consultaId },
        data: { advApiConsultaId },
      });

      // Aguardar e verificar status (polling)
      await updateConsultaStatus(consultaId, { status: 'fetching' });

      let apiStatus = await advApiService.verificarStatusConsulta(advApiConsultaId!);
      let attempts = 0;
      const maxAttempts = 60; // Máximo 10 minutos (60 * 10s)

      while (apiStatus && apiStatus.status !== 'completed' && apiStatus.status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Espera 10 segundos
        apiStatus = await advApiService.verificarStatusConsulta(advApiConsultaId!);
        attempts++;

        if (apiStatus?.processedCount) {
          await updateConsultaStatus(consultaId, {
            progress: Math.round((apiStatus.processedCount / (apiStatus.totalPublicacoes || 1)) * 50),
          });
        }
      }

      if (!apiStatus || apiStatus.status === 'failed') {
        throw new Error(apiStatus?.errorMessage || 'Consulta falhou na ADVAPI');
      }

      if (attempts >= maxAttempts) {
        throw new Error('Timeout aguardando resposta da ADVAPI');
      }

      // Buscar publicações paginadas
      await updateConsultaStatus(consultaId, { status: 'saving' });

      // Buscar limite de monitoramento da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { monitoringLimit: true },
      });

      const monthlyLimit = company?.monitoringLimit || 0; // 0 = ilimitado

      // Contar publicações já importadas neste mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const currentMonthCount = await prisma.publication.count({
        where: {
          companyId,
          createdAt: { gte: startOfMonth },
        },
      });

      // Calcular quantas ainda podem ser importadas
      const remainingQuota = monthlyLimit > 0 ? Math.max(0, monthlyLimit - currentMonthCount) : Infinity;
      let quotaExhausted = false;

      if (monthlyLimit > 0) {
        appLogger.info('Monitoring limit check', {
          consultaId,
          companyId,
          monthlyLimit,
          currentMonthCount,
          remainingQuota,
        });

        if (remainingQuota === 0) {
          appLogger.warn('Monthly monitoring limit reached', {
            consultaId,
            companyId,
            monthlyLimit,
            currentMonthCount,
          });
          quotaExhausted = true;
        }
      }

      let page = 1;
      let totalPublications = 0;
      let savedCount = 0;
      let importedCount = 0;
      let hasMore = !quotaExhausted;

      while (hasMore) {
        const pubResponse = await advApiService.listarPublicacoes(
          advogadoOab,
          ufOab,
          page,
          MONITORING_BATCH_SIZE,
          dataInicio,
          dataFim
        );

        if (!pubResponse.success || pubResponse.publicacoes.length === 0) {
          hasMore = false;
          break;
        }

        totalPublications = pubResponse.total;
        const totalPages = pubResponse.totalPages;

        await updateConsultaStatus(consultaId, {
          totalPublications,
          currentPage: page,
          totalPages,
          progress: 50 + Math.round((page / totalPages) * 50),
        });

        // Salvar publicações em batch
        for (const pub of pubResponse.publicacoes) {
          try {
            // Verificar se já existe
            const existing = await prisma.publication.findFirst({
              where: {
                companyId,
                monitoredOabId,
                numeroProcesso: pub.numeroProcesso,
              },
            });

            if (!existing) {
              const newPub = await prisma.publication.create({
                data: {
                  companyId,
                  monitoredOabId,
                  numeroProcesso: pub.numeroProcesso,
                  siglaTribunal: pub.siglaTribunal,
                  dataPublicacao: new Date(pub.dataPublicacao),
                  tipoComunicacao: pub.tipoComunicacao || null,
                  textoComunicacao: pub.textoComunicacao || null,
                },
              });

              savedCount++;

              // Verificar se atingiu o limite mensal
              if (monthlyLimit > 0 && savedCount >= remainingQuota) {
                appLogger.info('Monthly monitoring limit reached during import', {
                  consultaId,
                  companyId,
                  monthlyLimit,
                  savedCount,
                  remainingQuota,
                });
                quotaExhausted = true;
              }

              // Auto-importar se configurado
              if (autoImport) {
                const imported = await autoImportPublication(companyId, newPub.id, pub);
                if (imported) importedCount++;
              }
            }
          } catch (pubError) {
            appLogger.error('Error saving publication', pubError as Error, {
              numeroProcesso: pub.numeroProcesso,
            });
          }

          // Sair do loop se o limite foi atingido
          if (quotaExhausted) break;
        }

        await updateConsultaStatus(consultaId, { savedCount, importedCount });

        // Verificar se deve continuar para próxima página
        if (quotaExhausted) {
          hasMore = false;
          appLogger.info('Stopping pagination due to quota limit', {
            consultaId,
            savedCount,
            remainingQuota,
          });
        } else {
          page++;
          hasMore = page <= totalPages;
        }

        // Pequeno delay entre páginas para não sobrecarregar
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Finalizar consulta
      const quotaNote = quotaExhausted
        ? `Importação limitada: ${savedCount}/${totalPublications} publicações (limite mensal: ${monthlyLimit})`
        : undefined;

      await prisma.oABConsulta.update({
        where: { id: consultaId },
        data: {
          status: 'COMPLETED',
          totalPublicacoes: totalPublications,
          importedCount: savedCount,
          completedAt: new Date(),
          notes: quotaNote,
        },
      });

      // Atualizar última consulta da OAB
      await prisma.monitoredOAB.update({
        where: { id: monitoredOabId },
        data: {
          lastConsultaAt: new Date(),
          lastConsultaId: advApiConsultaId,
        },
      });

      await updateConsultaStatus(consultaId, {
        status: 'completed',
        progress: 100,
        totalPublications,
        savedCount,
        importedCount,
        completedAt: new Date().toISOString(),
      });

      appLogger.info('OAB consulta completed', {
        consultaId,
        totalPublications,
        savedCount,
        importedCount,
        quotaExhausted,
        monthlyLimit,
      });

      return {
        success: true,
        totalPublications,
        savedCount,
        importedCount,
        quotaExhausted,
      };

    } catch (error: any) {
      appLogger.error('OAB consulta failed', error as Error, { consultaId });

      await prisma.oABConsulta.update({
        where: { id: consultaId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      await updateConsultaStatus(consultaId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  });

  // Event handlers
  monitoringQueue.on('completed', (job, result) => {
    appLogger.info('Monitoring job completed', {
      jobName: job.name,
      consultaId: job.data.consultaId,
      result,
    });
  });

  monitoringQueue.on('failed', (job, err) => {
    appLogger.error('Monitoring job failed', err as Error, {
      jobName: job.name,
      consultaId: job.data.consultaId,
    });
  });

  monitoringQueue.on('stalled', (job) => {
    appLogger.warn('Monitoring job stalled', {
      jobName: job.name,
      consultaId: job.data.consultaId,
    });
  });

} else {
  appLogger.info('Monitoring queue processors DISABLED (ENABLE_QUEUE_PROCESSORS=false)');
}

// Helper para auto-importar publicação como caso
async function autoImportPublication(
  companyId: string,
  publicationId: string,
  pubData: any
): Promise<boolean> {
  try {
    // Verificar se já existe processo com este número
    const existingCase = await prisma.case.findFirst({
      where: { companyId, processNumber: pubData.numeroProcesso },
    });

    if (existingCase) {
      // Apenas marcar como importado
      await prisma.publication.update({
        where: { id: publicationId },
        data: {
          imported: true,
          importedCaseId: existingCase.id,
          importedAt: new Date(),
        },
      });
      return true;
    }

    // Criar cliente genérico
    const client = await prisma.client.create({
      data: {
        companyId,
        name: `Parte - ${pubData.numeroProcesso}`,
        notes: `Cliente criado automaticamente via monitoramento. Tribunal: ${pubData.siglaTribunal}. Aguardando dados completos.`,
      },
    });

    // Criar caso
    const newCase = await prisma.case.create({
      data: {
        companyId,
        clientId: client.id,
        processNumber: pubData.numeroProcesso,
        court: pubData.siglaTribunal,
        subject: pubData.tipoComunicacao || 'Processo importado via monitoramento',
        status: 'ACTIVE',
        notes: pubData.textoComunicacao,
      },
    });

    // Atualizar publicação
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        imported: true,
        importedCaseId: newCase.id,
        importedClientId: client.id,
        importedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    appLogger.error('Auto import failed', error as Error, {
      publicationId,
      processNumber: pubData.numeroProcesso,
    });
    return false;
  }
}

// Estatísticas da fila
export const getMonitoringQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    monitoringQueue.getWaitingCount(),
    monitoringQueue.getActiveCount(),
    monitoringQueue.getCompletedCount(),
    monitoringQueue.getFailedCount(),
    monitoringQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

// Enfileirar consultas diárias para todas as OABs ativas
export const enqueueDailyMonitoring = async () => {
  appLogger.info('Enqueueing daily OAB monitoring...');

  const activeOabs = await prisma.monitoredOAB.findMany({
    where: { status: 'ACTIVE' },
    include: {
      company: {
        select: { id: true, subscriptionStatus: true, active: true },
      },
    },
  });

  const validOabs = activeOabs.filter(
    oab => oab.company.active && ['ACTIVE', 'TRIAL'].includes(oab.company.subscriptionStatus || '')
  );

  appLogger.info('Found active OABs for daily monitoring', { count: validOabs.length });

  // Últimos 3 dias
  const dataFim = new Date().toISOString().split('T')[0];
  const dataInicio = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const oab of validOabs) {
    try {
      // Criar registro de consulta
      const consulta = await prisma.oABConsulta.create({
        data: {
          companyId: oab.companyId,
          monitoredOabId: oab.id,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          tribunais: oab.tribunais,
          status: 'PENDING',
        },
      });

      // Enfileirar
      await enqueueOabConsulta(
        consulta.id,
        oab.id,
        oab.companyId,
        oab.name,
        oab.oab,
        oab.oabState,
        dataInicio,
        dataFim,
        oab.tribunais,
        oab.autoImport
      );

      // Delay entre OABs para distribuir carga
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));

    } catch (error) {
      appLogger.error('Failed to enqueue daily monitoring for OAB', error as Error, {
        oabId: oab.id,
        oab: oab.oab,
      });
    }
  }
};

export default monitoringQueue;
