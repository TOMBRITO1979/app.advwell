import prisma from '../utils/prisma';
import { enqueueAppointmentReminder } from '../queues/whatsapp.queue';
import { appLogger } from '../utils/logger';

/**
 * Configurações do job de lembretes
 */
const REMINDER_CONFIG = {
  // Enviar lembrete X horas antes do evento
  hoursBeforeEvent: 24,
  // Tipos de evento que recebem lembrete
  eventTypes: ['COMPROMISSO', 'AUDIENCIA', 'GOOGLE_MEET'] as const,
  // Template padrão para lembretes (pode ser customizado por empresa)
  defaultTemplateName: 'appointment_reminder',
};

/**
 * Busca eventos que precisam de lembrete
 * Critérios:
 * - Data entre agora e X horas no futuro
 * - Não completado
 * - Tipo é compromisso, audiência ou Google Meet
 * - Cliente tem telefone
 * - Empresa tem WhatsApp configurado e ativo
 * - Ainda não recebeu lembrete (não tem WhatsAppMessage com eventId)
 */
export async function findEventsNeedingReminder(): Promise<any[]> {
  const now = new Date();
  const futureLimit = new Date(now.getTime() + REMINDER_CONFIG.hoursBeforeEvent * 60 * 60 * 1000);

  // Buscar empresas com WhatsApp ativo
  const companiesWithWhatsApp = await prisma.whatsAppConfig.findMany({
    where: { isActive: true },
    select: { companyId: true },
  });

  const activeCompanyIds = companiesWithWhatsApp.map((c) => c.companyId);

  if (activeCompanyIds.length === 0) {
    appLogger.debug('Nenhuma empresa com WhatsApp ativo');
    return [];
  }

  // Buscar eventos que precisam de lembrete
  const events = await prisma.scheduleEvent.findMany({
    where: {
      companyId: { in: activeCompanyIds },
      date: {
        gte: now,
        lte: futureLimit,
      },
      completed: false,
      type: { in: [...REMINDER_CONFIG.eventTypes] },
      clientId: { not: null },
      client: {
        phone: { not: null },
        active: true,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
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

  // Filtrar eventos que já receberam lembrete
  const eventsWithoutReminder: any[] = [];

  for (const event of events) {
    const existingReminder = await prisma.whatsAppMessage.findFirst({
      where: {
        eventId: event.id,
        type: 'REMINDER',
      },
    });

    if (!existingReminder) {
      eventsWithoutReminder.push(event);
    }
  }

  return eventsWithoutReminder;
}

/**
 * Processa lembretes de consulta
 * Chamado pelo cron job
 */
export async function processAppointmentReminders(): Promise<{
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
    const events = await findEventsNeedingReminder();

    if (events.length === 0) {
      appLogger.debug('Nenhum evento precisa de lembrete');
      return result;
    }

    appLogger.info('Processando lembretes de consulta', { count: events.length });

    for (const event of events) {
      try {
        result.processed++;

        // Buscar template customizado da empresa ou usar padrão
        const template = await prisma.whatsAppTemplate.findFirst({
          where: {
            companyId: event.companyId,
            category: 'UTILITY',
            status: 'APPROVED',
          },
          orderBy: { createdAt: 'desc' },
        });

        const templateName = template?.name || REMINDER_CONFIG.defaultTemplateName;

        // Enfileirar lembrete
        await enqueueAppointmentReminder({
          companyId: event.companyId,
          eventId: event.id,
          clientId: event.client.id,
          phone: event.client.phone!,
          clientName: event.client.name,
          eventTitle: event.title,
          eventDate: event.date,
          templateName,
        });

        result.success++;

        appLogger.info('Lembrete enfileirado', {
          eventId: event.id,
          clientName: event.client.name,
          eventDate: event.date,
        });
      } catch (error: any) {
        result.failed++;
        const errorMsg = `Erro ao processar evento ${event.id}: ${error.message}`;
        result.errors.push(errorMsg);
        appLogger.error('Erro ao enfileirar lembrete', error as Error, {
          eventId: event.id,
        });
      }
    }

    appLogger.info('Processamento de lembretes concluído', result);
    return result;
  } catch (error: any) {
    appLogger.error('Erro ao processar lembretes', error as Error);
    throw error;
  }
}

/**
 * Busca eventos com consultas pendentes de confirmação
 * Pode ser usado para enviar lembretes de confirmação
 */
export async function findPendingConfirmations(): Promise<any[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Buscar eventos das próximas 24h que ainda não foram confirmados
  // (campo completed = false pode indicar não confirmado)
  const events = await prisma.scheduleEvent.findMany({
    where: {
      date: {
        gte: now,
        lte: tomorrow,
      },
      completed: false,
      type: { in: ['COMPROMISSO', 'AUDIENCIA'] },
      clientId: { not: null },
      client: {
        phone: { not: null },
        active: true,
      },
      company: {
        whatsAppConfig: {
          isActive: true,
        },
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
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

  return events;
}

export default {
  processAppointmentReminders,
  findEventsNeedingReminder,
  findPendingConfirmations,
  REMINDER_CONFIG,
};
