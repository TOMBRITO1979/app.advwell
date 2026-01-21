import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import nodemailer from 'nodemailer';

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
    const formattedDate = new Date(request.dueDate).toLocaleDateString('pt-BR');

    const subject = isOverdue
      ? `[URGENTE] Documento pendente: ${request.documentName}`
      : `Lembrete: Prazo para documento "${request.documentName}"`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isOverdue ? '#dc2626' : '#2563eb'};">
          ${isOverdue ? 'Documento com prazo vencido' : 'Lembrete de documento'}
        </h2>
        <p>Olá <strong>${request.client.name}</strong>,</p>
        <p>
          ${isOverdue
            ? `O prazo para envio do documento <strong>"${request.documentName}"</strong> venceu em <strong>${formattedDate}</strong>.`
            : `Lembramos que o prazo para envio do documento <strong>"${request.documentName}"</strong> é <strong>${formattedDate}</strong>.`
          }
        </p>
        ${request.description ? `<p><em>${request.description}</em></p>` : ''}
        <p>Por favor, ${isOverdue ? 'envie o documento o mais rápido possível' : 'não esqueça de enviar o documento dentro do prazo'}.</p>
        <br>
        <p>Atenciosamente,<br><strong>${request.company.name}</strong></p>
      </div>
    `;

    // Criar transporter com configuração da empresa
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
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

        // Por enquanto, apenas Email está implementado
        // WhatsApp será adicionado quando integrarmos com a Meta API
        if (channel === 'EMAIL' || channel === 'BOTH' || !channel) {
          if (request.client.email) {
            if (await sendEmailReminder(request)) {
              sent = true;
            }
          }
        }

        // TODO: Implementar WhatsApp quando integração estiver completa
        // if (channel === 'WHATSAPP' || channel === 'BOTH') {
        //   if (await sendWhatsAppReminder(request)) sent = true;
        // }

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

export default {
  processDocumentRequestReminders,
  findRequestsNeedingReminder,
  REMINDER_CONFIG,
};
