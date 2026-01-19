import Queue from 'bull';
import prisma from '../utils/prisma';
import { createRedisClient, redis } from '../utils/redis';
import { appLogger } from '../utils/logger';
import { getAdvApiService, AdvApiPublicacao } from '../services/advapi.service';
import { normalizeProcessNumber } from '../utils/processNumber';

// ESCALABILIDADE: Configuração via ambiente
const MONITORING_CONCURRENCY = parseInt(process.env.MONITORING_CONCURRENCY || '2');
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

// Configuração de lotes
const BATCH_DAYS = 7; // Processar 7 dias por lote
const MAX_BATCHES_PER_JOB = 12; // Máximo 12 lotes por job (84 dias)
const BATCH_DELAY_MS = 1000; // 1 segundo entre lotes

appLogger.info('Monitoring Queue config', {
  concurrency: MONITORING_CONCURRENCY,
  processorsEnabled: ENABLE_QUEUE_PROCESSORS,
  batchDays: BATCH_DAYS,
  maxBatchesPerJob: MAX_BATCHES_PER_JOB,
});

// Interface para status da consulta
interface MonitoringConsultaStatus {
  status: 'pending' | 'processing' | 'fetching' | 'saving' | 'completed' | 'failed';
  progress: number;
  totalPublications: number;
  savedCount: number;
  importedCount: number;
  advogadoCadastrado: boolean;
  currentBatch: number;
  totalBatches: number;
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
      delay: 10000,
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
  await redis.setex(key, 86400 * 7, JSON.stringify({ ...parsed, ...status }));
}

// Helper para buscar status
export async function getConsultaQueueStatus(consultaId: string): Promise<MonitoringConsultaStatus | null> {
  const key = `monitoring:${consultaId}:status`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Helper para formatar data como YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper para adicionar dias a uma data
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
  autoImport: boolean = false,
  forceFullSync: boolean = false
): Promise<string> {
  const jobId = `consulta-${consultaId}-${Date.now()}`;

  // Inicializar status
  await updateConsultaStatus(consultaId, {
    status: 'pending',
    progress: 0,
    totalPublications: 0,
    savedCount: 0,
    importedCount: 0,
    advogadoCadastrado: false,
    currentBatch: 0,
    totalBatches: 0,
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
      forceFullSync,
    },
    {
      jobId,
      delay: 500,
    }
  );

  appLogger.info('OAB consulta enqueued', {
    jobId,
    consultaId,
    advogadoNome,
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
      dataInicio: requestedDataInicio,
      dataFim: requestedDataFim,
      autoImport,
      forceFullSync,
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

      // Buscar OAB monitorada para pegar lastSyncDate
      const monitoredOab = await prisma.monitoredOAB.findUnique({
        where: { id: monitoredOabId },
        select: { lastSyncDate: true },
      });

      // Determinar data inicial real (usar lastSyncDate se disponível para sync incremental)
      // Pular sync incremental quando forceFullSync=true (consultas manuais com datas específicas)
      let effectiveDataInicio = new Date(requestedDataInicio);
      if (!forceFullSync && monitoredOab?.lastSyncDate) {
        const lastSync = new Date(monitoredOab.lastSyncDate);
        // Usar o dia seguinte ao último sync para não repetir
        const nextDay = addDays(lastSync, 1);
        if (nextDay > effectiveDataInicio) {
          effectiveDataInicio = nextDay;
          appLogger.info('Using incremental sync', {
            consultaId,
            lastSyncDate: monitoredOab.lastSyncDate,
            effectiveDataInicio: formatDate(effectiveDataInicio),
          });
        }
      } else if (forceFullSync) {
        appLogger.info('Using full sync (forceFullSync=true)', {
          consultaId,
          requestedDataInicio,
          requestedDataFim,
        });
      }

      const dataFim = new Date(requestedDataFim);

      // Se data inicial é maior que data fim, não há nada para sincronizar
      if (effectiveDataInicio > dataFim) {
        appLogger.info('No new data to sync', {
          consultaId,
          effectiveDataInicio: formatDate(effectiveDataInicio),
          dataFim: formatDate(dataFim),
        });

        await prisma.oABConsulta.update({
          where: { id: consultaId },
          data: {
            status: 'COMPLETED',
            totalPublicacoes: 0,
            importedCount: 0,
            completedAt: new Date(),
            notes: 'Sem novas publicações para sincronizar (já atualizado)',
          },
        });

        await updateConsultaStatus(consultaId, {
          status: 'completed',
          progress: 100,
          totalPublications: 0,
          savedCount: 0,
          completedAt: new Date().toISOString(),
        });

        return { success: true, message: 'No new data to sync' };
      }

      // Obter serviço ADVAPI
      const advApiService = getAdvApiService();

      // Calcular número de lotes necessários
      const totalDays = Math.ceil((dataFim.getTime() - effectiveDataInicio.getTime()) / (1000 * 60 * 60 * 24));
      const totalBatches = Math.min(Math.ceil(totalDays / BATCH_DAYS), MAX_BATCHES_PER_JOB);

      appLogger.info('Starting batch processing', {
        consultaId,
        totalDays,
        totalBatches,
        effectiveDataInicio: formatDate(effectiveDataInicio),
        dataFim: formatDate(dataFim),
      });

      await updateConsultaStatus(consultaId, {
        status: 'fetching',
        totalBatches,
        currentBatch: 0,
      });

      // Buscar limite de monitoramento da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { monitoringLimit: true },
      });

      const monthlyLimit = company?.monitoringLimit || 0;

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

      const remainingQuota = monthlyLimit > 0 ? Math.max(0, monthlyLimit - currentMonthCount) : Infinity;
      let quotaExhausted = monthlyLimit > 0 && remainingQuota === 0;

      let totalPublications = 0;
      let savedCount = 0;
      let importedCount = 0;
      let advogadoCadastrado = false;
      let latestPublicationDate: Date | null = null;

      // Processar em lotes
      for (let batchIndex = 0; batchIndex < totalBatches && !quotaExhausted; batchIndex++) {
        const batchStart = addDays(effectiveDataInicio, batchIndex * BATCH_DAYS);
        const batchEnd = new Date(Math.min(
          addDays(batchStart, BATCH_DAYS - 1).getTime(),
          dataFim.getTime()
        ));

        appLogger.info('Processing batch', {
          consultaId,
          batchIndex: batchIndex + 1,
          totalBatches,
          batchStart: formatDate(batchStart),
          batchEnd: formatDate(batchEnd),
        });

        await updateConsultaStatus(consultaId, {
          currentBatch: batchIndex + 1,
          progress: Math.round((batchIndex / totalBatches) * 100),
        });

        // Consultar buffer para este lote
        const bufferResponse = await advApiService.consultarBuffer(
          companyId,
          advogadoNome,
          formatDate(batchStart),
          formatDate(batchEnd)
        );

        // Se advogado não está cadastrado, cadastrar e sair
        if (!bufferResponse.encontrado && batchIndex === 0) {
          appLogger.info('Advogado não encontrado, cadastrando na ADVAPI', {
            consultaId,
            advogadoNome,
            advogadoOab,
            ufOab,
          });

          const cadastroResponse = await advApiService.cadastrarAdvogado(
            companyId,
            advogadoNome,
            advogadoOab,
            ufOab
          );

          if (cadastroResponse.error) {
            throw new Error(`Erro ao cadastrar advogado: ${cadastroResponse.error}`);
          }

          advogadoCadastrado = true;

          await prisma.oABConsulta.update({
            where: { id: consultaId },
            data: {
              status: 'COMPLETED',
              totalPublicacoes: 0,
              importedCount: 0,
              completedAt: new Date(),
              notes: 'Advogado cadastrado para monitoramento. Publicações serão disponibilizadas após processamento (7h-21h, seg-sáb).',
            },
          });

          await prisma.monitoredOAB.update({
            where: { id: monitoredOabId },
            data: { lastConsultaAt: new Date() },
          });

          await updateConsultaStatus(consultaId, {
            status: 'completed',
            progress: 100,
            advogadoCadastrado: true,
            totalPublications: 0,
            savedCount: 0,
            importedCount: 0,
            completedAt: new Date().toISOString(),
          });

          return {
            success: true,
            advogadoCadastrado: true,
            totalPublications: 0,
            savedCount: 0,
            importedCount: 0,
          };
        }

        // Processar publicações deste lote
        const publicacoes = bufferResponse.publicacoes || [];
        totalPublications += publicacoes.length;

        await updateConsultaStatus(consultaId, { status: 'saving' });

        for (const pub of publicacoes) {
          if (quotaExhausted) break;

          try {
            // Normalizar número do processo
            const numeroProcesso = normalizeProcessNumber(pub.numeroProcesso);

            // Verificar se já existe
            const existing = await prisma.publication.findFirst({
              where: {
                companyId,
                monitoredOabId,
                numeroProcesso,
              },
            });

            if (!existing) {
              const pubDate = new Date(pub.dataPublicacao || pub.dataDisponibilizacao || new Date());

              const newPub = await prisma.publication.create({
                data: {
                  companyId,
                  monitoredOabId,
                  numeroProcesso,
                  siglaTribunal: pub.siglaTribunal || pub.tribunal || 'N/A',
                  dataPublicacao: pubDate,
                  tipoComunicacao: pub.tipoComunicacao || pub.classeProcessual || null,
                  textoComunicacao: pub.textoLimpo || pub.textoComunicacao || pub.texto || null,
                },
              });

              savedCount++;

              // Atualizar data da publicação mais recente
              if (!latestPublicationDate || pubDate > latestPublicationDate) {
                latestPublicationDate = pubDate;
              }

              // Verificar limite mensal
              if (monthlyLimit > 0 && savedCount >= remainingQuota) {
                quotaExhausted = true;
              }

              // Auto-importar se configurado
              if (autoImport && !quotaExhausted) {
                const imported = await autoImportPublication(companyId, newPub.id, pub);
                if (imported) importedCount++;
              }
            }
          } catch (pubError) {
            appLogger.error('Error saving publication', pubError as Error, {
              numeroProcesso: pub.numeroProcesso,
            });
          }
        }

        // Checkpoint: Atualizar lastSyncDate após cada lote processado com sucesso
        if (savedCount > 0 || publicacoes.length > 0) {
          await prisma.monitoredOAB.update({
            where: { id: monitoredOabId },
            data: { lastSyncDate: batchEnd },
          });

          appLogger.info('Batch checkpoint saved', {
            consultaId,
            batchIndex: batchIndex + 1,
            lastSyncDate: formatDate(batchEnd),
            savedCount,
          });
        }

        await updateConsultaStatus(consultaId, {
          savedCount,
          importedCount,
          totalPublications,
        });

        // Delay entre lotes para evitar sobrecarga
        if (batchIndex < totalBatches - 1 && !quotaExhausted) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
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

      // Atualizar última consulta e última data sincronizada
      await prisma.monitoredOAB.update({
        where: { id: monitoredOabId },
        data: {
          lastConsultaAt: new Date(),
          lastSyncDate: latestPublicationDate || dataFim,
        },
      });

      await updateConsultaStatus(consultaId, {
        status: 'completed',
        progress: 100,
        advogadoCadastrado,
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
        totalBatches,
      });

      return {
        success: true,
        advogadoCadastrado,
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
  pubData: AdvApiPublicacao
): Promise<boolean> {
  try {
    // Normalizar número do processo
    const processNumber = normalizeProcessNumber(pubData.numeroProcesso);

    // Verificar se já existe processo com este número
    const existingCase = await prisma.case.findFirst({
      where: { companyId, processNumber },
    });

    if (existingCase) {
      // Atualiza o campo ADVAPI do processo existente
      await prisma.case.update({
        where: { id: existingCase.id },
        data: {
          ultimaPublicacaoAdvapi: pubData.textoLimpo || pubData.textoComunicacao || pubData.texto || existingCase.ultimaPublicacaoAdvapi,
        },
      });

      // Marcar publicação como importada
      await prisma.publication.update({
        where: { id: publicationId },
        data: {
          imported: true,
          importedCaseId: existingCase.id,
          importedAt: new Date(),
        },
      });

      appLogger.info('Processo existente atualizado com nova publicação ADVAPI', {
        caseId: existingCase.id,
        processNumber,
      });

      return true;
    }

    // Criar processo apenas com número e andamento ADVAPI
    // Demais dados (tribunal, assunto, cliente) serão preenchidos manualmente pelo usuário
    const newCase = await prisma.case.create({
      data: {
        companyId,
        processNumber,
        ultimaPublicacaoAdvapi: pubData.textoLimpo || pubData.textoComunicacao || pubData.texto || null,
      },
    });

    // Atualizar publicação
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        imported: true,
        importedCaseId: newCase.id,
        importedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    appLogger.error('Auto import failed', error as Error, {
      publicationId,
      processNumber: normalizeProcessNumber(pubData.numeroProcesso),
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

  // Período: últimos 7 dias (será ajustado pelo lastSyncDate)
  const dataFim = new Date().toISOString().split('T')[0];
  const dataInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));

    } catch (error) {
      appLogger.error('Failed to enqueue daily monitoring for OAB', error as Error, {
        oabId: oab.id,
        oab: oab.oab,
      });
    }
  }
};

export default monitoringQueue;
