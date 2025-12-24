import prisma from '../utils/prisma';
import { enqueueCampaignEmails } from '../queues/email.queue';
import { appLogger } from '../utils/logger';

/**
 * Envia campanha de email usando fila Bull para processamento em background.
 * Cada email é processado individualmente com retry automático.
 *
 * @param campaignId - ID da campanha a ser enviada
 */
export async function sendCampaign(campaignId: string) {
  try {
    // Buscar campanha para validação
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        company: {
          include: {
            smtpConfig: true,
          },
        },
        _count: {
          select: {
            recipients: {
              where: { status: 'pending' },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (!campaign.company.smtpConfig) {
      throw new Error('Configuração SMTP não encontrada');
    }

    if (!campaign.company.smtpConfig.isActive) {
      throw new Error('Configuração SMTP inativa');
    }

    const pendingCount = campaign._count.recipients;

    if (pendingCount === 0) {
      appLogger.info('Campaign has no pending recipients', { campaignId });

      // Mark as completed if no recipients
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          sentAt: new Date(),
        },
      });

      return;
    }

    // Enqueue all emails for processing
    const result = await enqueueCampaignEmails(campaignId);

    appLogger.info('Campaign started successfully', {
      campaignId,
      campaignName: campaign.name,
      emailsQueued: result.enqueued,
    });
  } catch (error: any) {
    appLogger.error('Error starting campaign', error as Error, { campaignId });

    // Mark campaign as failed
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'failed' },
    }).catch((err) => appLogger.error('Failed to mark campaign as failed', err as Error, { campaignId }));

    throw error;
  }
}
