import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { getTelegramConfig, sendTelegramMessage } from '../services/telegram.service';

/**
 * Configurações do job de lembretes de contas a pagar
 */
const REMINDER_CONFIG = {
  // Enviar lembrete X horas antes do vencimento
  hoursBeforeDue: 24,
  // Intervalo mínimo entre lembretes (em horas)
  minHoursBetweenReminders: 24,
  // Máximo de lembretes por conta
  maxReminders: 3,
};

interface AccountPayableForReminder {
  id: string;
  supplier: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  companyId: string;
  company: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    logo: string | null;
  };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  telegramChatId: string | null;
}

/**
 * Busca contas a pagar que precisam de lembrete
 * Critérios:
 * - Status é PENDING
 * - Vencimento em 24h OU já vencido
 * - Não atingiu máximo de lembretes
 * - Intervalo mínimo desde último lembrete
 */
export async function findAccountsNeedingReminder(): Promise<AccountPayableForReminder[]> {
  const now = new Date();
  const futureLimit = new Date(now.getTime() + REMINDER_CONFIG.hoursBeforeDue * 60 * 60 * 1000);
  const minReminderTime = new Date(now.getTime() - REMINDER_CONFIG.minHoursBetweenReminders * 60 * 60 * 1000);

  const accounts = await prisma.accountPayable.findMany({
    where: {
      status: 'PENDING',
      reminderCount: { lt: REMINDER_CONFIG.maxReminders },
      OR: [
        // Vencimento em 24h
        {
          dueDate: {
            gte: now,
            lte: futureLimit,
          },
        },
        // Já vencido
        {
          dueDate: { lt: now },
        },
      ],
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          logo: true,
        },
      },
    },
  });

  // Filtrar por intervalo mínimo desde último lembrete
  const filteredAccounts = accounts.filter((acc) => {
    if (!acc.lastReminderAt) return true;
    return new Date(acc.lastReminderAt) < minReminderTime;
  });

  // Converter Decimal para number
  return filteredAccounts.map((acc) => ({
    ...acc,
    amount: Number(acc.amount),
  })) as AccountPayableForReminder[];
}

/**
 * Busca usuários ADMIN da empresa
 */
async function findCompanyAdmins(companyId: string): Promise<AdminUser[]> {
  const admins = await prisma.user.findMany({
    where: {
      companyId,
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      telegramChatId: true,
    },
  });

  return admins;
}

/**
 * Formata valor em reais
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera o template HTML do email de lembrete de conta
 */
function generateEmailTemplate(account: AccountPayableForReminder, isOverdue: boolean): string {
  const formattedDate = new Date(account.dueDate).toLocaleDateString('pt-BR');
  const formattedAmount = formatCurrency(account.amount);
  const company = account.company;

  const primaryColor = isOverdue ? '#dc2626' : '#43A047';
  const bgColor = isOverdue ? '#fef2f2' : '#E8F5E9';

  const statusBadge = isOverdue
    ? '<span style="background-color: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">VENCIDA</span>'
    : '<span style="background-color: #C8E6C9; color: #2E7D32; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">VENCE EM BREVE</span>';

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
          ${isOverdue ? '⚠️ Conta Vencida' : '📅 Lembrete de Conta a Pagar'}
        </h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          ${isOverdue
            ? 'Você possui uma conta vencida que requer atenção imediata:'
            : 'Você possui uma conta com vencimento próximo:'
          }
        </p>

        <!-- Account Box -->
        <div style="background-color: ${bgColor}; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="color: ${primaryColor}; font-weight: 600; margin: 0 0 8px; font-size: 14px;">
            DETALHES DA CONTA:
          </p>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Fornecedor:</td>
              <td style="color: #1f2937; font-weight: 500; padding: 4px 0;">${account.supplier}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Descrição:</td>
              <td style="color: #1f2937; padding: 4px 0;">${account.description}</td>
            </tr>
            ${account.category ? `
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Categoria:</td>
              <td style="color: #1f2937; padding: 4px 0;">${account.category}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Amount and Date -->
        <div style="display: flex; gap: 16px; margin: 16px 0;">
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; flex: 1;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">
              Valor
            </p>
            <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">
              ${formattedAmount}
            </p>
          </div>
        </div>

        <div style="background-color: #f9fafb; padding: 16px; margin: 16px 0; border-radius: 8px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">
            Vencimento
          </p>
          <p style="color: ${isOverdue ? '#dc2626' : '#1f2937'}; font-size: 20px; font-weight: 700; margin: 0;">
            ${formattedDate}
          </p>
          ${isOverdue ? '<p style="color: #dc2626; font-size: 12px; margin: 4px 0 0;">Conta vencida</p>' : ''}
        </div>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
          Acesse o sistema AdvWell para realizar o pagamento ou atualizar o status da conta.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 24px; text-align: center;">
        <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
          ${company.name}
        </p>
        <p style="color: #6b7280; font-size: 11px; margin: 16px 0 0;">
          Esta é uma mensagem automática do sistema AdvWell.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Gera mensagem Telegram de lembrete
 */
function generateTelegramMessage(account: AccountPayableForReminder, isOverdue: boolean): string {
  const formattedDate = new Date(account.dueDate).toLocaleDateString('pt-BR');
  const formattedAmount = formatCurrency(account.amount);

  const emoji = isOverdue ? '🚨' : '📅';
  const title = isOverdue ? 'Conta Vencida' : 'Lembrete de Conta';

  return `
${emoji} <b>${title}</b>

<b>Fornecedor:</b> ${escapeHtml(account.supplier)}
<b>Descrição:</b> ${escapeHtml(account.description)}
<b>Valor:</b> ${formattedAmount}
<b>Vencimento:</b> ${formattedDate}${isOverdue ? ' (VENCIDA)' : ''}
${account.category ? `<b>Categoria:</b> ${escapeHtml(account.category)}` : ''}

Acesse o AdvWell para gerenciar esta conta.
  `.trim();
}

/**
 * Escapa caracteres especiais do HTML para Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Envia lembrete por Email usando SMTP da empresa
 */
async function sendEmailReminder(
  account: AccountPayableForReminder,
  admin: AdminUser,
  isOverdue: boolean
): Promise<boolean> {
  try {
    // Buscar configuração SMTP da empresa
    const smtpConfig = await prisma.sMTPConfig.findUnique({
      where: { companyId: account.companyId },
    });

    if (!smtpConfig) {
      appLogger.debug('SMTP não configurado para empresa', { companyId: account.companyId });
      return false;
    }

    // Assunto do email
    const subject = isOverdue
      ? `[URGENTE] Conta Vencida - ${account.supplier}`
      : `Lembrete: Conta a Pagar - ${account.supplier}`;

    // Gerar HTML do email
    const html = generateEmailTemplate(account, isOverdue);

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
      from: `"${smtpConfig.fromName || account.company.name}" <${smtpConfig.fromEmail}>`,
      to: admin.email,
      subject,
      html,
    });

    appLogger.info('Email de lembrete de conta enviado', {
      accountId: account.id,
      adminEmail: admin.email,
      isOverdue,
    });

    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar lembrete Email de conta', error as Error, {
      accountId: account.id,
      adminEmail: admin.email,
    });
    return false;
  }
}

/**
 * Envia lembrete por Telegram
 */
async function sendTelegramReminder(
  account: AccountPayableForReminder,
  admin: AdminUser,
  isOverdue: boolean
): Promise<boolean> {
  if (!admin.telegramChatId) return false;

  try {
    // Buscar config do Telegram (empresa ou sistema)
    const telegramConfig = await getTelegramConfig(account.companyId);

    if (!telegramConfig) {
      appLogger.debug('Telegram não configurado', { companyId: account.companyId });
      return false;
    }

    // Gerar mensagem
    const message = generateTelegramMessage(account, isOverdue);

    // Enviar
    const success = await sendTelegramMessage(telegramConfig.botToken, {
      chatId: admin.telegramChatId,
      text: message,
      parseMode: 'HTML',
    });

    if (success) {
      appLogger.info('Telegram de lembrete de conta enviado', {
        accountId: account.id,
        adminId: admin.id,
        isOverdue,
        usedSystemBot: telegramConfig.isSystemDefault,
      });
    }

    return success;
  } catch (error) {
    appLogger.error('Erro ao enviar lembrete Telegram de conta', error as Error, {
      accountId: account.id,
      adminId: admin.id,
    });
    return false;
  }
}

/**
 * Processa lembretes de contas a pagar
 * Chamado pelo cron job a cada hora
 */
export async function processAccountsPayableReminders(): Promise<{
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
    const accounts = await findAccountsNeedingReminder();

    if (accounts.length === 0) {
      appLogger.debug('Nenhuma conta a pagar precisa de lembrete');
      return result;
    }

    appLogger.info('Processando lembretes de contas a pagar', { count: accounts.length });

    // Agrupar contas por empresa para buscar admins uma vez só
    const accountsByCompany = accounts.reduce((acc, account) => {
      if (!acc[account.companyId]) {
        acc[account.companyId] = [];
      }
      acc[account.companyId].push(account);
      return acc;
    }, {} as Record<string, AccountPayableForReminder[]>);

    // Processar por empresa
    for (const [companyId, companyAccounts] of Object.entries(accountsByCompany)) {
      // Buscar admins da empresa
      const admins = await findCompanyAdmins(companyId);

      if (admins.length === 0) {
        appLogger.debug('Nenhum admin encontrado para empresa', { companyId });
        continue;
      }

      // Processar cada conta
      for (const account of companyAccounts) {
        try {
          result.processed++;
          let sentToAny = false;
          const isOverdue = new Date(account.dueDate) < new Date();

          // Enviar para cada admin
          for (const admin of admins) {
            let sentEmail = false;
            let sentTelegram = false;

            // Tentar enviar email
            if (admin.email) {
              sentEmail = await sendEmailReminder(account, admin, isOverdue);
            }

            // Tentar enviar Telegram
            if (admin.telegramChatId) {
              sentTelegram = await sendTelegramReminder(account, admin, isOverdue);
            }

            if (sentEmail || sentTelegram) {
              sentToAny = true;
            }
          }

          if (sentToAny) {
            // Atualizar conta
            await prisma.accountPayable.update({
              where: { id: account.id },
              data: {
                lastReminderAt: new Date(),
                reminderCount: { increment: 1 },
              },
            });

            result.success++;
            appLogger.info('Lembrete de conta enviado', {
              accountId: account.id,
              supplier: account.supplier,
              adminsNotified: admins.length,
            });
          } else {
            result.failed++;
            result.errors.push(`Não foi possível notificar nenhum admin para conta ${account.id}`);
          }
        } catch (error: any) {
          result.failed++;
          const errorMsg = `Erro ao processar conta ${account.id}: ${error.message}`;
          result.errors.push(errorMsg);
          appLogger.error('Erro ao enviar lembrete de conta', error as Error, {
            accountId: account.id,
          });
        }
      }
    }

    appLogger.info('Processamento de lembretes de contas concluído', result);
    return result;
  } catch (error: any) {
    appLogger.error('Erro ao processar lembretes de contas', error as Error);
    throw error;
  }
}

export default {
  processAccountsPayableReminders,
  findAccountsNeedingReminder,
  REMINDER_CONFIG,
};
