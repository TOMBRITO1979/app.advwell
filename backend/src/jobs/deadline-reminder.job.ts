import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import { sendDeadlineReminderEmail } from '../utils/email';
import { enqueueTelegramEventNotification } from '../queues/telegram.queue';

/**
 * Configurações do job de lembretes de prazos/tarefas
 */
const REMINDER_CONFIG = {
  // Enviar lembrete X horas antes do vencimento
  hoursBeforeEvent: 24,
  // Tipos de evento que recebem lembrete
  eventTypes: ['PRAZO', 'TAREFA'] as const,
  // Máximo de lembretes por evento
  maxReminders: 2,
};

interface EventForReminder {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: Date;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
  assignedUsers: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      telegramChatId: string | null;
    };
  }>;
}

/**
 * Busca eventos (Prazos e Tarefas) que precisam de lembrete
 * Critérios:
 * - Tipo é PRAZO ou TAREFA
 * - Data entre agora e X horas no futuro OU já vencido (até 48h atrás)
 * - Não completado
 * - Tem usuários atribuídos
 * - Ainda não atingiu máximo de lembretes
 */
export async function findDeadlinesNeedingReminder(): Promise<EventForReminder[]> {
  const now = new Date();
  const futureLimit = new Date(now.getTime() + REMINDER_CONFIG.hoursBeforeEvent * 60 * 60 * 1000);
  const pastLimit = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48h atrás para vencidos

  const events = await prisma.scheduleEvent.findMany({
    where: {
      type: { in: [...REMINDER_CONFIG.eventTypes] },
      completed: false,
      reminderCount: { lt: REMINDER_CONFIG.maxReminders },
      date: {
        gte: pastLimit,
        lte: futureLimit,
      },
      assignedUsers: {
        some: {}, // Tem pelo menos um usuário atribuído
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedUsers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              telegramChatId: true,
            },
          },
        },
      },
    },
  });

  // Filtrar por intervalo mínimo desde último lembrete (12 horas)
  const minReminderTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const filteredEvents = events.filter((event) => {
    if (!event.lastReminderAt) return true;
    return new Date(event.lastReminderAt) < minReminderTime;
  });

  return filteredEvents as EventForReminder[];
}

/**
 * Processa lembretes de prazos e tarefas
 * Chamado pelo cron job
 */
export async function processDeadlineReminders(): Promise<{
  processed: number;
  emailsSent: number;
  telegramSent: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    emailsSent: 0,
    telegramSent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const events = await findDeadlinesNeedingReminder();

    if (events.length === 0) {
      appLogger.debug('Nenhum prazo/tarefa precisa de lembrete');
      return result;
    }

    appLogger.info('Processando lembretes de prazos/tarefas', { count: events.length });

    for (const event of events) {
      try {
        result.processed++;
        const now = new Date();
        const isOverdue = event.date < now;

        // Enviar para cada usuário atribuído
        for (const assignment of event.assignedUsers) {
          const user = assignment.user;

          // Enviar email
          try {
            await sendDeadlineReminderEmail(
              user.email,
              user.name,
              event.title,
              event.date,
              event.type,
              event.description,
              event.company.name,
              isOverdue
            );
            result.emailsSent++;

            appLogger.info('Email de lembrete enviado', {
              eventId: event.id,
              userId: user.id,
              type: event.type,
              isOverdue,
            });
          } catch (emailError: any) {
            appLogger.error('Erro ao enviar email de lembrete', emailError as Error, {
              eventId: event.id,
              userId: user.id,
            });
          }

          // Enviar Telegram se configurado
          if (user.telegramChatId) {
            try {
              await enqueueTelegramEventNotification({
                companyId: event.companyId,
                recipientType: 'user',
                chatId: user.telegramChatId,
                eventTitle: event.title,
                eventDate: event.date.toISOString(),
                eventType: event.type,
                companyName: event.company.name,
                isReminder: true,
                isOverdue,
              });
              result.telegramSent++;
            } catch (telegramError: any) {
              appLogger.error('Erro ao enviar Telegram de lembrete', telegramError as Error, {
                eventId: event.id,
                userId: user.id,
              });
            }
          }
        }

        // Atualizar contador de lembretes
        await prisma.scheduleEvent.update({
          where: { id: event.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });

      } catch (error: any) {
        result.failed++;
        const errorMsg = `Erro ao processar evento ${event.id}: ${error.message}`;
        result.errors.push(errorMsg);
        appLogger.error('Erro ao processar lembrete de prazo/tarefa', error as Error, {
          eventId: event.id,
        });
      }
    }

    appLogger.info('Processamento de lembretes de prazos/tarefas concluído', result);
    return result;
  } catch (error: any) {
    appLogger.error('Erro ao processar lembretes de prazos/tarefas', error as Error);
    throw error;
  }
}

export default {
  processDeadlineReminders,
  findDeadlinesNeedingReminder,
  REMINDER_CONFIG,
};
