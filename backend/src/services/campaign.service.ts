import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import { replaceTemplateVariables } from '../utils/email-templates';

// Enviar campanha em background
export async function sendCampaign(campaignId: string) {
  try {
    // Buscar campanha
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        company: {
          include: {
            smtpConfig: true,
          },
        },
        recipients: {
          where: { status: 'pending' },
        },
      },
    });

    if (!campaign || !campaign.company.smtpConfig) {
      throw new Error('Campanha ou configuração SMTP não encontrada');
    }

    const smtp = campaign.company.smtpConfig;

    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: decrypt(smtp.password),
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    // Enviar para cada destinatário com delay
    for (const recipient of campaign.recipients) {
      try {
        // Substituir variáveis do template
        const variables = {
          nome_cliente: recipient.recipientName || recipient.recipientEmail,
          nome_empresa: campaign.company.name,
          data: new Date().getFullYear().toString(),
        };

        const personalizedSubject = replaceTemplateVariables(campaign.subject, variables);
        const personalizedBody = replaceTemplateVariables(campaign.body, variables);

        await transporter.sendMail({
          from: `${smtp.fromName || campaign.company.name} <${smtp.fromEmail}>`,
          to: recipient.recipientEmail,
          subject: personalizedSubject,
          html: personalizedBody,
        });

        // Atualizar como enviado
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        sentCount++;

        // Delay de 100ms entre emails (10 emails/segundo)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        // Atualizar como falhou
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            errorMessage: error.message || 'Erro desconhecido',
          },
        });

        failedCount++;
        console.error(`Erro ao enviar para ${recipient.recipientEmail}:`, error.message);
      }
    }

    // Atualizar campanha como completa
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
    });

    console.log(`✅ Campanha ${campaign.name} concluída: ${sentCount} enviados, ${failedCount} falhas`);
  } catch (error) {
    console.error('Erro ao enviar campanha:', error);

    // Marcar campanha como falha
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'failed' },
    }).catch(console.error);
  }
}
