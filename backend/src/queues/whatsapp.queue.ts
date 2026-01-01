import Queue from 'bull';
import prisma from '../utils/prisma';
import { whatsappService } from '../services/whatsapp.service';
import { createRedisClient } from '../utils/redis';
import { appLogger } from '../utils/logger';

// Configuração da fila usando createRedisClient (suporta Sentinel)
const whatsappQueue = new Queue('whatsapp-messages', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000, // 10 segundos entre retries
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// ============================================================================
// PROCESSADORES DE JOBS
// ============================================================================

/**
 * Processa envio de mensagem de campanha
 * Rate limit: ~5 mensagens/segundo (200ms delay entre jobs)
 */
whatsappQueue.process('send-campaign-message', 5, async (job) => {
  const { recipientId, campaignId, companyId } = job.data;

  try {
    // Buscar dados do destinatário
    const recipient = await prisma.whatsAppCampaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        campaign: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!recipient) {
      throw new Error(`Destinatário não encontrado: ${recipientId}`);
    }

    if (recipient.status !== 'pending') {
      appLogger.info('WhatsApp Queue: Destinatário já processado', {
        recipientId,
        status: recipient.status,
      });
      return { success: true, skipped: true };
    }

    const campaign = recipient.campaign;
    const template = campaign.template;

    // Enviar mensagem via serviço
    const result = await whatsappService.sendTemplate({
      companyId,
      phone: recipient.recipientPhone,
      templateName: template.name,
      language: template.language,
      variables: (recipient.variables as Record<string, string>) || {},
      campaignId,
      messageType: 'CAMPAIGN',
    });

    // Atualizar status do destinatário
    if (result.success) {
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'sent',
          messageId: result.messageId,
          sentAt: new Date(),
        },
      });
    } else {
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'failed',
          errorMessage: result.error,
        },
      });
    }

    return result;
  } catch (error: any) {
    // Atualizar destinatário como falha
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'failed',
        errorMessage: error.message || 'Erro desconhecido',
      },
    });

    throw error; // Re-throw para trigger retry
  }
});

/**
 * Processa envio de lembrete de consulta
 */
whatsappQueue.process('send-reminder', 5, async (job) => {
  const {
    companyId,
    eventId,
    clientId,
    phone,
    clientName,
    eventTitle,
    eventDate,
    templateName,
  } = job.data;

  try {
    const result = await whatsappService.sendAppointmentReminder({
      companyId,
      eventId,
      clientId,
      phone,
      clientName,
      eventTitle,
      eventDate: new Date(eventDate),
      templateName,
    });

    return result;
  } catch (error: any) {
    appLogger.error('WhatsApp Queue: Erro ao enviar lembrete', error as Error, {
      eventId,
      clientId,
    });
    throw error;
  }
});

/**
 * Verifica conclusão de uma campanha
 */
whatsappQueue.process('check-campaign-completion', async (job) => {
  const { campaignId } = job.data;

  try {
    // Contar destinatários por status
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      prisma.whatsAppCampaignRecipient.count({
        where: { campaignId, status: 'sent' },
      }),
      prisma.whatsAppCampaignRecipient.count({
        where: { campaignId, status: 'failed' },
      }),
      prisma.whatsAppCampaignRecipient.count({
        where: { campaignId, status: 'pending' },
      }),
    ]);

    // Se não há mais pendentes, marcar campanha como concluída
    if (pendingCount === 0) {
      await prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          sentCount,
          failedCount,
          sentAt: new Date(),
        },
      });

      appLogger.info('WhatsApp: Campanha concluída', {
        campaignId,
        sentCount,
        failedCount,
      });
    }

    return {
      success: true,
      sentCount,
      failedCount,
      pendingCount,
    };
  } catch (error: any) {
    appLogger.error('WhatsApp Queue: Erro ao verificar conclusão', error as Error, {
      campaignId,
    });
    throw error;
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

whatsappQueue.on('completed', (job, result) => {
  if (job.name === 'send-campaign-message' && result?.success && !result?.skipped) {
    appLogger.info('WhatsApp Queue: Mensagem de campanha enviada', {
      jobId: job.id,
      messageId: result.messageId,
    });
  }
});

whatsappQueue.on('failed', (job, err) => {
  appLogger.error('WhatsApp Queue: Job falhou', err as Error, {
    jobName: job.name,
    jobId: job.id,
    attemptsMade: job.attemptsMade,
  });
});

whatsappQueue.on('stalled', (job) => {
  appLogger.warn('WhatsApp Queue: Job travado', {
    jobName: job.name,
    jobId: job.id,
  });
});

// ============================================================================
// FUNÇÕES EXPORTADAS
// ============================================================================

/**
 * Enfileira todas as mensagens de uma campanha
 */
export const enqueueCampaignMessages = async (campaignId: string) => {
  try {
    // Buscar todos os destinatários pendentes
    const recipients = await prisma.whatsAppCampaignRecipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      select: {
        id: true,
        recipientPhone: true,
        campaign: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (recipients.length === 0) {
      appLogger.info('WhatsApp Queue: Nenhum destinatário pendente', { campaignId });
      return { enqueued: 0 };
    }

    const companyId = recipients[0].campaign.companyId;

    // Enfileirar cada mensagem com delay progressivo
    // Meta API rate limit: ~80 msg/s, mas vamos ser conservadores com 5 msg/s
    const jobs = recipients.map((recipient, index) =>
      whatsappQueue.add(
        'send-campaign-message',
        {
          recipientId: recipient.id,
          campaignId,
          companyId,
        },
        {
          jobId: `whatsapp-campaign-${recipient.id}-${Date.now()}`,
          delay: index * 200, // 200ms entre cada (5 msg/s)
        }
      )
    );

    await Promise.all(jobs);

    // Agendar verificação de conclusão
    const estimatedTime = recipients.length * 500 + 30000; // 500ms/msg + 30s buffer
    await whatsappQueue.add(
      'check-campaign-completion',
      { campaignId },
      {
        jobId: `whatsapp-check-${campaignId}-${Date.now()}`,
        delay: estimatedTime,
      }
    );

    appLogger.info('WhatsApp Queue: Campanha enfileirada', {
      campaignId,
      count: recipients.length,
      estimatedCompletionTime: estimatedTime,
    });

    return {
      enqueued: recipients.length,
      estimatedCompletionTime: estimatedTime,
    };
  } catch (error: any) {
    appLogger.error('WhatsApp Queue: Erro ao enfileirar campanha', error as Error, {
      campaignId,
    });
    throw error;
  }
};

/**
 * Enfileira lembrete de consulta
 */
export const enqueueAppointmentReminder = async (params: {
  companyId: string;
  eventId: string;
  clientId: string;
  phone: string;
  clientName: string;
  eventTitle: string;
  eventDate: Date;
  templateName?: string;
}) => {
  const job = await whatsappQueue.add('send-reminder', params, {
    jobId: `whatsapp-reminder-${params.eventId}-${Date.now()}`,
  });

  appLogger.info('WhatsApp Queue: Lembrete enfileirado', {
    eventId: params.eventId,
    jobId: job.id,
  });

  return { jobId: job.id };
};

/**
 * Obtém estatísticas da fila
 */
export const getWhatsAppQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    whatsappQueue.getWaitingCount(),
    whatsappQueue.getActiveCount(),
    whatsappQueue.getCompletedCount(),
    whatsappQueue.getFailedCount(),
    whatsappQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

/**
 * Limpa jobs antigos (usar com cuidado)
 */
export const cleanOldJobs = async (gracePeriodMs: number = 24 * 60 * 60 * 1000) => {
  await whatsappQueue.clean(gracePeriodMs, 'completed');
  await whatsappQueue.clean(gracePeriodMs, 'failed');
};

export default whatsappQueue;
