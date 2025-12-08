import prisma from '../utils/prisma';
import { enqueueCampaignEmails } from '../queues/email.queue';

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
      console.log(`Campaign ${campaignId} has no pending recipients`);

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

    console.log(`📧 Campaign ${campaign.name} started: ${result.enqueued} emails queued`);
  } catch (error: any) {
    console.error('Error starting campaign:', error);

    // Mark campaign as failed
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'failed' },
    }).catch(console.error);

    throw error;
  }
}
