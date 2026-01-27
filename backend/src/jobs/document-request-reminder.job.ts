import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { whatsappService } from '../services/whatsapp.service';
import { decrypt } from '../utils/encryption';

/**
 * Configurações do job de lembretes de documentos
 */
const REMINDER_CONFIG = {
  // Enviar lembrete X horas antes do prazo
  hoursBeforeDue: 24,
  // Intervalo mínimo entre lembretes (em horas)
  minHoursBetweenReminders: 48,
  // Máximo de lembretes por solicitação
  maxReminders: 5,
};

interface DocumentRequestForReminder {
  id: string;
  documentName: string;
  description: string | null;
  dueDate: Date;
  status: string;
  notificationChannel: string | null;
  whatsappTemplateId: string | null;
  autoRemind: boolean;
  reminderCount: number;
  lastReminderAt: Date | null;
  companyId: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  company: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    logo: string | null;
  };
}

/**
 * Busca solicitações que precisam de lembrete
 * Critérios:
 * - Status não é RECEIVED ou CANCELLED
 * - autoRemind está ativado
 * - Prazo em 24h OU prazo já vencido
 * - Não atingiu máximo de lembretes
 * - Intervalo mínimo desde último lembrete
 */
export async function findRequestsNeedingReminder(): Promise<DocumentRequestForReminder[]> {
  const now = new Date();
  const futureLimit = new Date(now.getTime() + REMINDER_CONFIG.hoursBeforeDue * 60 * 60 * 1000);
  const minReminderTime = new Date(now.getTime() - REMINDER_CONFIG.minHoursBetweenReminders * 60 * 60 * 1000);

  const requests = await prisma.documentRequest.findMany({
    where: {
      status: { notIn: ['RECEIVED', 'CANCELLED'] },
      autoRemind: true,
      reminderCount: { lt: REMINDER_CONFIG.maxReminders },
      OR: [
        // Prazo em 24h
        {
          dueDate: {
            gte: now,
            lte: futureLimit,
          },
        },
        // Prazo já vencido
        {
          dueDate: { lt: now },
        },
      ],
      // Cliente tem email ou telefone
      client: {
        OR: [
          { email: { not: null } },
          { phone: { not: null } },
        ],
        active: true,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          logo: true,
        },
      },
    },
  });

  // Filtrar por intervalo mínimo desde último lembrete
  const filteredRequests = requests.filter((req) => {
    if (!req.lastReminderAt) return true;
    return new Date(req.lastReminderAt) < minReminderTime;
  });

  return filteredRequests as DocumentRequestForReminder[];
}

/**
 * Gera o template HTML profissional do email
 */
function generateEmailTemplate(request: DocumentRequestForReminder, isOverdue: boolean): string {
  const formattedDate = new Date(request.dueDate).toLocaleDateString('pt-BR');
  const company = request.company;

  // Formatar endereço completo
  const addressParts = [company.address, company.city, company.state].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(' - ') : '';

  // Cor do tema baseada no status (Verde do sistema: #43A047)
  const primaryColor = isOverdue ? '#dc2626' : '#43A047';
  const bgColor = isOverdue ? '#fef2f2' : '#E8F5E9';

  // Status badge (Verde do sistema para lembretes normais)
  const statusBadge = isOverdue
    ? '<span style="background-color: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">PRAZO VENCIDO</span>'
    : '<span style="background-color: #C8E6C9; color: #2E7D32; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">LEMBRETE</span>';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        ${company.logo
          ? `<img src="${company.logo}" alt="${company.name}" style="max-height: 50px; max-width: 200px;">`
          : `<h1 style="color: #ffffff; margin: 0; font-size: 24px;">${company.name}</h1>`
        }
      </td>
    </tr>

    <!-- Status Badge -->
    <tr>
      <td style="padding: 20px 24px 0; text-align: center;">
        ${statusBadge}
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">
          Solicitação de Documento
        </h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Prezado(a) <strong>${request.client.name}</strong>,
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Esperamos que esteja bem.
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          ${isOverdue
            ? 'Verificamos que o prazo para envio do(s) documento(s) solicitado(s) já expirou. Pedimos a gentileza de enviar o mais breve possível:'
            : 'Gostaríamos de informar que estamos aguardando o(s) seguinte(s) documento(s):'
          }
        </p>

        <!-- Document Box -->
        <div style="background-color: ${bgColor}; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="color: ${primaryColor}; font-weight: 600; margin: 0 0 8px; font-size: 14px;">
            DOCUMENTO(S) SOLICITADO(S):
          </p>
          <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 500;">
            ${request.documentName}
          </p>
          ${request.description ? `
          <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0; font-style: italic;">
            ${request.description}
          </p>
          ` : ''}
        </div>

        <!-- Deadline -->
        <div style="background-color: #f9fafb; padding: 16px; margin: 16px 0; border-radius: 8px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">
            Prazo de Entrega
          </p>
          <p style="color: ${isOverdue ? '#dc2626' : '#1f2937'}; font-size: 20px; font-weight: 700; margin: 0;">
            ${formattedDate}
          </p>
          ${isOverdue ? '<p style="color: #dc2626; font-size: 12px; margin: 4px 0 0;">Prazo expirado</p>' : ''}
        </div>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 16px 0;">
          ${isOverdue
            ? 'Caso já tenha enviado o documento, por favor desconsidere esta mensagem.'
            : 'Caso já tenha enviado o documento ou tenha alguma dificuldade, por favor nos informe.'
          }
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 16px 0 0;">
          Agradecemos a atenção e permanecemos à disposição para qualquer esclarecimento.
        </p>
      </td>
    </tr>

    <!-- Contact Section -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
          <p style="color: #1f2937; font-weight: 600; margin: 0 0 12px; font-size: 14px;">
            Em caso de dúvidas, entre em contato:
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
            ${company.email ? `
            <tr>
              <td style="padding: 4px 0;">
                <span style="color: #6b7280; font-size: 14px;">📧</span>
                <a href="mailto:${company.email}" style="color: #2563eb; text-decoration: none; font-size: 14px; margin-left: 8px;">${company.email}</a>
              </td>
            </tr>
            ` : ''}
            ${company.phone ? `
            <tr>
              <td style="padding: 4px 0;">
                <span style="color: #6b7280; font-size: 14px;">📞</span>
                <a href="tel:${company.phone.replace(/\D/g, '')}" style="color: #2563eb; text-decoration: none; font-size: 14px; margin-left: 8px;">${company.phone}</a>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 24px; text-align: center;">
        <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
          ${company.name}
        </p>
        ${fullAddress ? `
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          ${fullAddress}
        </p>
        ` : ''}
        <p style="color: #6b7280; font-size: 11px; margin: 16px 0 0;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Envia lembrete por Email usando SMTP da empresa
 */
async function sendEmailReminder(request: DocumentRequestForReminder): Promise<boolean> {
  if (!request.client.email) return false;

  try {
    // Buscar configuração SMTP da empresa
    const smtpConfig = await prisma.sMTPConfig.findUnique({
      where: { companyId: request.companyId },
    });

    if (!smtpConfig) {
      appLogger.debug('SMTP não configurado para empresa', { companyId: request.companyId });
      return false;
    }

    const isOverdue = new Date(request.dueDate) < new Date();

    // Assunto do email
    const subject = isOverdue
      ? `[URGENTE] Documento Pendente - ${request.documentName}`
      : `Solicitação de Documento - ${request.documentName}`;

    // Gerar HTML do email
    const html = generateEmailTemplate(request, isOverdue);

    // Criar transporter com configuração da empresa
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: decrypt(smtpConfig.password),
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.fromName || request.company.name}" <${smtpConfig.fromEmail}>`,
      to: request.client.email,
      subject,
      html,
    });

    appLogger.info('Email de lembrete enviado', {
      requestId: request.id,
      clientEmail: request.client.email,
      isOverdue,
    });

    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar lembrete Email', error as Error, {
      requestId: request.id,
    });
    return false;
  }
}

/**
 * Envia lembrete por WhatsApp usando a API do Meta
 */
async function sendWhatsAppReminder(request: DocumentRequestForReminder, isOverdue: boolean): Promise<boolean> {
  if (!request.client.phone) return false;

  try {
    // Verificar se a empresa tem WhatsApp configurado
    const whatsappConfig = await prisma.whatsAppConfig.findUnique({
      where: { companyId: request.companyId },
    });

    if (!whatsappConfig || !whatsappConfig.isActive) {
      appLogger.debug('WhatsApp não configurado para empresa', { companyId: request.companyId });
      return false;
    }

    const result = await whatsappService.sendDocumentRequestReminder({
      companyId: request.companyId,
      documentRequestId: request.id,
      clientId: request.client.id,
      phone: request.client.phone,
      clientName: request.client.name,
      documentName: request.documentName,
      dueDate: new Date(request.dueDate),
      isOverdue,
      companyName: request.company.name,
      templateName: request.whatsappTemplateId || undefined,
    });

    if (result.success) {
      appLogger.info('WhatsApp de lembrete enviado', {
        requestId: request.id,
        clientPhone: request.client.phone,
        isOverdue,
      });
      return true;
    } else {
      appLogger.warn('Falha ao enviar WhatsApp de lembrete', {
        requestId: request.id,
        error: result.error,
      });
      return false;
    }
  } catch (error) {
    appLogger.error('Erro ao enviar lembrete WhatsApp', error as Error, {
      requestId: request.id,
    });
    return false;
  }
}

/**
 * Processa lembretes de solicitação de documentos
 * Chamado pelo cron job a cada hora
 */
export async function processDocumentRequestReminders(): Promise<{
  processed: number;
  success: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const requests = await findRequestsNeedingReminder();

    if (requests.length === 0) {
      appLogger.debug('Nenhuma solicitação de documento precisa de lembrete');
      return result;
    }

    appLogger.info('Processando lembretes de documentos', { count: requests.length });

    for (const request of requests) {
      try {
        result.processed++;
        let sent = false;

        const channel = request.notificationChannel;
        const isOverdue = new Date(request.dueDate) < new Date();

        // Enviar Email se configurado
        if (channel === 'EMAIL' || channel === 'BOTH' || !channel) {
          if (request.client.email) {
            if (await sendEmailReminder(request)) {
              sent = true;
            }
          }
        }

        // Enviar WhatsApp se configurado
        if (channel === 'WHATSAPP' || channel === 'BOTH') {
          if (request.client.phone) {
            if (await sendWhatsAppReminder(request, isOverdue)) {
              sent = true;
            }
          }
        }

        if (sent) {
          // Atualizar solicitação
          await prisma.documentRequest.update({
            where: { id: request.id },
            data: {
              status: 'REMINDED',
              lastReminderAt: new Date(),
              reminderCount: { increment: 1 },
            },
          });

          result.success++;
          appLogger.info('Lembrete de documento enviado', {
            requestId: request.id,
            clientName: request.client.name,
            documentName: request.documentName,
          });
        } else {
          // Se não conseguiu enviar mas tem canal configurado, registrar como falha
          if (channel) {
            result.failed++;
            result.errors.push(`Não foi possível enviar para ${request.id} - canal ${channel}`);
          } else {
            // Se não tem canal configurado e não tem email, apenas pular
            appLogger.debug('Solicitação sem canal de notificação configurado', {
              requestId: request.id,
            });
          }
        }
      } catch (error: any) {
        result.failed++;
        const errorMsg = `Erro ao processar solicitação ${request.id}: ${error.message}`;
        result.errors.push(errorMsg);
        appLogger.error('Erro ao enviar lembrete de documento', error as Error, {
          requestId: request.id,
        });
      }
    }

    appLogger.info('Processamento de lembretes de documentos concluído', result);
    return result;
  } catch (error: any) {
    appLogger.error('Erro ao processar lembretes de documentos', error as Error);
    throw error;
  }
}

// Exportar funções para uso no controller de lembrete manual
export {
  sendEmailReminder,
  sendWhatsAppReminder,
  generateEmailTemplate,
};

// Exportar tipo para reuso
export type { DocumentRequestForReminder };

export default {
  processDocumentRequestReminders,
  findRequestsNeedingReminder,
  REMINDER_CONFIG,
};
