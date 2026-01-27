import Queue from 'bull';
import { createRedisClient } from '../utils/redis';
import { appLogger } from '../utils/logger';
import {
  getTelegramConfig,
  sendTelegramMessage,
  formatEventNotificationForUser,
  formatEventNotificationForClient,
  formatDeadlineReminderForUser,
} from '../services/telegram.service';

// Controle de processadores para evitar duplicação em múltiplas replicas
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

// Tipos de job
interface TelegramEventNotificationJob {
  companyId: string;
  recipientType: 'user' | 'client';
  chatId: string;
  eventTitle: string;
  eventDate: string; // ISO string
  eventType: string;
  companyName: string;
  isReminder?: boolean; // Se é um lembrete automático
  isOverdue?: boolean; // Se o prazo/tarefa está vencido
}

// Criar fila usando createRedisClient (suporta Sentinel)
const telegramQueue = new Queue<TelegramEventNotificationJob>('telegram-notifications', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Registrar processadores apenas se habilitado
if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Registering Telegram queue processors...');

  telegramQueue.process('send-event-notification', 5, async (job) => {
    const { companyId, recipientType, chatId, eventTitle, eventDate, eventType, companyName, isReminder, isOverdue } = job.data;

    appLogger.info('Processando notificação Telegram', {
      companyId,
      recipientType,
      chatId,
      jobId: job.id,
      isReminder,
      isOverdue,
    });

    // Buscar config da empresa (com fallback para bot padrão)
    const config = await getTelegramConfig(companyId);
    if (!config) {
      appLogger.warn('Telegram não configurado e sem bot padrão', { companyId });
      return { success: false, reason: 'Telegram não configurado' };
    }

    // Log para monitoramento quando usa bot padrão
    if (config.isSystemDefault) {
      appLogger.info('Notificação via bot Telegram padrão', { companyId, chatId });
    }

    // Formatar mensagem
    let text: string;
    if (isReminder) {
      text = formatDeadlineReminderForUser(eventTitle, new Date(eventDate), eventType, companyName, isOverdue || false);
    } else if (recipientType === 'user') {
      text = formatEventNotificationForUser(eventTitle, new Date(eventDate), eventType, companyName);
    } else {
      text = formatEventNotificationForClient(eventTitle, new Date(eventDate), companyName);
    }

    // Enviar
    const success = await sendTelegramMessage(config.botToken, { chatId, text });

    if (success) {
      appLogger.info('Notificação Telegram enviada com sucesso', { chatId, recipientType });
    } else {
      appLogger.warn('Falha ao enviar notificação Telegram', { chatId, recipientType });
    }

    return { success };
  });

  // Event handlers
  telegramQueue.on('completed', (job, result) => {
    appLogger.debug('Telegram job completed', { jobId: job.id, result });
  });

  telegramQueue.on('failed', (job, err) => {
    appLogger.error('Telegram job failed', err, { jobId: job.id, data: job.data });
  });
}

/**
 * Enfileira notificação de evento via Telegram
 */
export async function enqueueTelegramEventNotification(data: TelegramEventNotificationJob): Promise<void> {
  await telegramQueue.add('send-event-notification', data, {
    delay: 1000, // 1 segundo de delay para não sobrecarregar
  });
  appLogger.debug('Telegram notification enqueued', {
    recipientType: data.recipientType,
    chatId: data.chatId,
  });
}

export default telegramQueue;
