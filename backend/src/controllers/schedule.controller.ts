import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { generateGoogleMeetLink } from '../utils/googleMeet';
import { auditLogService } from '../services/audit-log.service';
import googleCalendarService from '../services/google-calendar.service';
import whatsappService from '../services/whatsapp.service';
import { appLogger } from '../utils/logger';
import * as pdfStyles from '../utils/pdfStyles';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';
import { sendEventAssignmentNotification } from '../utils/email';
import { enqueueTelegramEventNotification } from '../queues/telegram.queue';

export class ScheduleController {
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        title, description, type, priority, date, endDate, clientId, caseId, assignedUserIds
      } = req.body;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validar campo obrigatório
      if (!title || !date) {
        return res.status(400).json({ error: 'Título e data são obrigatórios' });
      }

      // Validar prioridade
      const validPriorities = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Prioridade inválida. Use: BAIXA, MEDIA, ALTA ou URGENTE' });
      }

      // SEGURANCA: Validar que todos os assignedUserIds pertencem à mesma empresa
      if (assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
        const validUsers = await prisma.user.count({
          where: {
            id: { in: assignedUserIds },
            companyId: companyId,
            active: true,
          },
        });

        if (validUsers !== assignedUserIds.length) {
          return res.status(400).json({
            error: 'Usuário inválido',
            message: 'Um ou mais usuários selecionados não pertencem a esta empresa'
          });
        }
      }

      // Verificar conflito de horário para os usuários atribuídos
      if (assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
        const eventStart = new Date(date);
        const eventEnd = endDate ? new Date(endDate) : new Date(eventStart.getTime() + 60 * 60 * 1000); // +1 hora padrão

        // Buscar eventos que conflitam com o novo horário para qualquer usuário atribuído
        const conflictingEvents = await prisma.scheduleEvent.findMany({
          where: {
            companyId,
            completed: false, // Apenas eventos não concluídos
            assignedUsers: {
              some: {
                userId: { in: assignedUserIds }
              }
            },
            // Verificar sobreposição de horários
            OR: [
              // Evento existente começa durante o novo evento
              {
                date: { gte: eventStart, lt: eventEnd }
              },
              // Evento existente termina durante o novo evento
              {
                endDate: { gt: eventStart, lte: eventEnd }
              },
              // Evento existente engloba o novo evento
              {
                AND: [
                  { date: { lte: eventStart } },
                  { endDate: { gte: eventEnd } }
                ]
              },
              // Novo evento engloba evento existente (evento sem endDate)
              {
                AND: [
                  { date: { gte: eventStart, lt: eventEnd } },
                  { endDate: null }
                ]
              }
            ]
          },
          include: {
            assignedUsers: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          }
        });

        if (conflictingEvents.length > 0) {
          // Encontrar quais usuários têm conflito
          const conflictingUserNames: string[] = [];
          for (const event of conflictingEvents) {
            for (const assignment of event.assignedUsers) {
              if (assignedUserIds.includes(assignment.userId) && !conflictingUserNames.includes(assignment.user.name)) {
                conflictingUserNames.push(assignment.user.name);
              }
            }
          }

          const conflictEvent = conflictingEvents[0];
          const conflictTime = new Date(conflictEvent.date).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'short'
          });

          return res.status(409).json({
            error: 'Conflito de horário',
            message: `${conflictingUserNames.join(', ')} já possui compromisso marcado: "${conflictEvent.title}" em ${conflictTime}`,
            conflictingEvent: {
              id: conflictEvent.id,
              title: conflictEvent.title,
              date: conflictEvent.date,
              endDate: conflictEvent.endDate
            }
          });
        }
      }

      // Gerar link do Google Meet se o tipo for GOOGLE_MEET
      let googleMeetLink: string | null = null;
      if (type === 'GOOGLE_MEET') {
        const startDate = new Date(date);
        const finalEndDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora se não informado
        googleMeetLink = generateGoogleMeetLink(title, startDate, finalEndDate, description || '');
      }

      // Se for TAREFA, definir kanbanStatus padrão como TODO
      const finalType = type || 'COMPROMISSO';
      const kanbanStatusValue = finalType === 'TAREFA' ? 'TODO' : undefined;

      const event = await prisma.scheduleEvent.create({
        data: {
          companyId,
          title,
          description,
          type: finalType,
          priority: priority || 'MEDIA',
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : null,
          clientId: clientId || null,
          caseId: caseId || null,
          createdBy,
          googleMeetLink,
          kanbanStatus: kanbanStatusValue,
          // Criar relações com usuários atribuídos
          assignedUsers: assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0
            ? {
                create: assignedUserIds.map((userId: string) => ({
                  userId,
                  companyId, // TAREFA 4.3: Isolamento de tenant direto
                })),
              }
            : undefined,
        },
        include: {
          client: {
            select: { id: true, name: true, cpf: true }
          },
          case: {
            select: { id: true, processNumber: true, subject: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          assignedUsers: {
            include: {
              user: {
                select: { id: true, name: true, email: true, telegramChatId: true }
              }
            }
          }
        }
      });

      // Log de auditoria
      await auditLogService.logScheduleEventCreate(event, req);

      // Enviar email de notificação para usuários atribuídos (exceto o criador)
      if (event.assignedUsers && event.assignedUsers.length > 0) {
        // Buscar nome do criador e nome da empresa
        const creator = await prisma.user.findUnique({
          where: { id: createdBy },
          select: { name: true, company: { select: { name: true } } }
        });
        const creatorName = creator?.name || 'Sistema';
        const companyName = creator?.company?.name;

        for (const assignment of event.assignedUsers) {
          // Não enviar email para o próprio criador
          if (assignment.user.id === createdBy) continue;

          // Enviar email de forma assíncrona (não bloqueia a resposta)
          sendEventAssignmentNotification(
            assignment.user.email!,
            assignment.user.name,
            event.title,
            event.date,
            event.type,
            event.description,
            creatorName,
            companyName
          ).catch(err => {
            appLogger.error('Erro ao enviar email de atribuição de evento', err as Error, {
              eventId: event.id,
              userId: assignment.user.id
            });
          });

          // Enviar notificação Telegram para usuários atribuídos (se tiver telegramChatId)
          if (assignment.user.telegramChatId) {
            enqueueTelegramEventNotification({
              companyId: companyId!,
              recipientType: 'user',
              chatId: assignment.user.telegramChatId,
              eventTitle: event.title,
              eventDate: event.date.toISOString(),
              eventType: event.type,
              companyName: companyName || 'Sua Empresa',
            }).catch(err => {
              appLogger.error('Erro ao enfileirar notificação Telegram', err as Error, {
                eventId: event.id,
                userId: assignment.user.id
              });
            });
          }
        }
      }

      // Enviar notificação Telegram para cliente atribuído (se tiver telegramChatId)
      if (clientId) {
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: { telegramChatId: true },
        });
        if (client?.telegramChatId) {
          const company = await prisma.company.findUnique({
            where: { id: companyId! },
            select: { name: true },
          });
          enqueueTelegramEventNotification({
            companyId: companyId!,
            recipientType: 'client',
            chatId: client.telegramChatId,
            eventTitle: event.title,
            eventDate: event.date.toISOString(),
            eventType: event.type,
            companyName: company?.name || 'Sua Empresa',
          }).catch(err => {
            appLogger.error('Erro ao enfileirar notificação Telegram para cliente', err as Error, {
              eventId: event.id,
              clientId
            });
          });
        }
      }

      // SINCRONIZAÇÃO PRAZO → CASE: Se criou um evento tipo PRAZO vinculado a um processo, atualizar Case.deadline
      if (type === 'PRAZO' && caseId) {
        try {
          await prisma.case.update({
            where: { id: caseId },
            data: {
              deadline: new Date(date),
              deadlineCompleted: false,
              deadlineCompletedAt: null,
            },
          });
          appLogger.info('Sincronização PRAZO→Case: deadline atualizado', { eventId: event.id, caseId });
        } catch (syncError) {
          appLogger.error('Erro ao sincronizar prazo com Case', syncError as Error, { eventId: event.id, caseId });
        }
      }

      // Google Calendar Sync: Criar evento no Google Calendar de todos os usuários envolvidos
      // Inclui o criador + todos os usuários atribuídos
      const usersToSync = new Set<string>();
      if (createdBy) usersToSync.add(createdBy);
      if (assignedUserIds && Array.isArray(assignedUserIds)) {
        assignedUserIds.forEach((uid: string) => usersToSync.add(uid));
      }

      const eventData = {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        type: event.type,
        priority: event.priority,
        googleMeetLink: event.googleMeetLink,
      };

      for (const userId of usersToSync) {
        try {
          const isSyncEnabled = await googleCalendarService.isSyncEnabled(userId);
          if (isSyncEnabled) {
            const googleEventId = await googleCalendarService.createEvent(userId, eventData);

            if (googleEventId) {
              // Salvar na tabela de sincronização por usuário
              await prisma.scheduleEventGoogleSync.create({
                data: {
                  eventId: event.id,
                  userId,
                  googleEventId,
                },
              });

              // Manter compatibilidade: salvar no campo legado se for o criador
              if (userId === createdBy) {
                await prisma.scheduleEvent.update({
                  where: { id: event.id },
                  data: { googleEventId },
                });
              }
            }
          }
        } catch (syncError) {
          appLogger.error('Erro ao sincronizar com Google Calendar', syncError as Error, { userId });
        }
      }

      res.status(201).json(event);
    } catch (error) {
      appLogger.error('Erro ao criar evento', error as Error);
      res.status(500).json({ error: 'Erro ao criar evento' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const {
        page = 1,
        limit = 20,
        search = '',
        type,
        completed,
        clientId,
        caseId,
        startDate,
        endDate
      } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {
        companyId,
      };

      // Visibilidade baseada em role:
      // - ADMIN e SUPER_ADMIN veem todos os eventos
      // - USER ve apenas eventos onde esta atribuido ou que criou
      if (userRole === 'USER') {
        where.AND = [
          {
            OR: [
              { createdBy: userId },
              { assignedUsers: { some: { userId: userId } } },
            ],
          },
        ];
      }

      // Filtro de busca unificada: título, descrição, nome do cliente, telefone do cliente ou nome do advogado
      if (search) {
        const searchFilter = {
          OR: [
            { title: { contains: String(search), mode: 'insensitive' as const } },
            { description: { contains: String(search), mode: 'insensitive' as const } },
            { client: { name: { contains: String(search), mode: 'insensitive' as const } } },
            { client: { phone: { contains: String(search), mode: 'insensitive' as const } } },
            { assignedUsers: { some: { user: { name: { contains: String(search), mode: 'insensitive' as const } } } } },
          ],
        };
        if (where.AND) {
          where.AND.push(searchFilter);
        } else {
          where.AND = [searchFilter];
        }
      }

      // Filtro por tipo
      if (type) {
        where.type = type;
      }

      // Filtro por status de conclusão
      if (completed !== undefined) {
        where.completed = completed === 'true';
      }

      // Filtro por cliente
      if (clientId) {
        where.clientId = String(clientId);
      }

      // Filtro por processo
      if (caseId) {
        where.caseId = String(caseId);
      }

      // Filtro por período
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(String(startDate));
        }
        if (endDate) {
          // Ajustar endDate para incluir o final do dia (23:59:59.999)
          const parsedEndDate = new Date(String(endDate));
          parsedEndDate.setUTCHours(23, 59, 59, 999);
          where.date.lte = parsedEndDate;
        }
      }

      const includeOptions = {
        client: {
          select: { id: true, name: true, cpf: true, phone: true }
        },
        case: {
          select: { id: true, processNumber: true, subject: true }
        },
        user: {
          select: { id: true, name: true }
        },
        assignedUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      };

      const now = new Date();

      // Buscar eventos futuros (incluindo hoje) ordenados por data ASC (mais próximo primeiro)
      const futureWhere = { ...where, date: { ...where.date, gte: now } };
      // Buscar eventos passados ordenados por data DESC (mais recente primeiro)
      const pastWhere = { ...where, date: { ...where.date, lt: now } };

      const [futureEvents, pastEvents, total] = await Promise.all([
        prisma.scheduleEvent.findMany({
          where: futureWhere,
          orderBy: { date: 'asc' },
          include: includeOptions,
        }),
        prisma.scheduleEvent.findMany({
          where: pastWhere,
          orderBy: { date: 'desc' },
          include: includeOptions,
        }),
        prisma.scheduleEvent.count({ where })
      ]);

      // Combinar: futuros primeiro, depois passados
      const allEvents = [...futureEvents, ...pastEvents];

      // Aplicar paginação manualmente
      const paginatedEvents = allEvents.slice(skip, skip + Number(limit));

      res.json({
        data: paginatedEvents,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      appLogger.error('Erro ao listar eventos', error as Error);
      res.status(500).json({ error: 'Erro ao listar eventos' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Construir filtro base
      const where: any = {
        id,
        companyId: companyId!,
      };

      // Visibilidade baseada em role:
      // - USER ve apenas eventos onde esta atribuido ou que criou
      if (userRole === 'USER') {
        where.OR = [
          { createdBy: userId },
          { assignedUsers: { some: { userId: userId } } },
        ];
      }

      const event = await prisma.scheduleEvent.findFirst({
        where,
        include: {
          client: {
            select: { id: true, name: true, cpf: true, phone: true, email: true }
          },
          case: {
            select: { id: true, processNumber: true, subject: true, court: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          assignedUsers: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }

      res.json(event);
    } catch (error) {
      appLogger.error('Erro ao buscar evento', error as Error);
      res.status(500).json({ error: 'Erro ao buscar evento' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        title, description, type, priority, date, endDate, clientId, caseId, completed, assignedUserIds, kanbanStatus
      } = req.body;

      const event = await prisma.scheduleEvent.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }

      // Validar prioridade se fornecida
      const validPriorities = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Prioridade inválida. Use: BAIXA, MEDIA, ALTA ou URGENTE' });
      }

      // SEGURANCA: Validar que todos os assignedUserIds pertencem à mesma empresa
      if (assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
        const validUsers = await prisma.user.count({
          where: {
            id: { in: assignedUserIds },
            companyId: companyId!,
            active: true,
          },
        });

        if (validUsers !== assignedUserIds.length) {
          return res.status(400).json({
            error: 'Usuário inválido',
            message: 'Um ou mais usuários selecionados não pertencem a esta empresa'
          });
        }
      }

      // Verificar conflito de horário se está alterando data/horário ou usuários atribuídos
      const usersToCheck = assignedUserIds !== undefined && Array.isArray(assignedUserIds)
        ? assignedUserIds
        : null; // null significa que não está alterando usuários

      // Se está alterando data ou usuários, verificar conflitos
      if (date || usersToCheck) {
        const eventStart = date ? new Date(date) : event.date;
        const eventEnd = endDate
          ? new Date(endDate)
          : (event.endDate || new Date(eventStart.getTime() + 60 * 60 * 1000));

        // Buscar usuários atuais do evento se não foi passado novo array
        let userIdsToCheck: string[] = [];
        if (usersToCheck) {
          userIdsToCheck = usersToCheck;
        } else {
          const currentAssignments = await prisma.eventAssignment.findMany({
            where: { eventId: id },
            select: { userId: true }
          });
          userIdsToCheck = currentAssignments.map(a => a.userId);
        }

        if (userIdsToCheck.length > 0) {
          const conflictingEvents = await prisma.scheduleEvent.findMany({
            where: {
              companyId,
              id: { not: id }, // Excluir o próprio evento sendo editado
              completed: false,
              assignedUsers: {
                some: {
                  userId: { in: userIdsToCheck }
                }
              },
              OR: [
                { date: { gte: eventStart, lt: eventEnd } },
                { endDate: { gt: eventStart, lte: eventEnd } },
                {
                  AND: [
                    { date: { lte: eventStart } },
                    { endDate: { gte: eventEnd } }
                  ]
                },
                {
                  AND: [
                    { date: { gte: eventStart, lt: eventEnd } },
                    { endDate: null }
                  ]
                }
              ]
            },
            include: {
              assignedUsers: {
                include: {
                  user: { select: { id: true, name: true } }
                }
              }
            }
          });

          if (conflictingEvents.length > 0) {
            const conflictingUserNames: string[] = [];
            for (const evt of conflictingEvents) {
              for (const assignment of evt.assignedUsers) {
                if (userIdsToCheck.includes(assignment.userId) && !conflictingUserNames.includes(assignment.user.name)) {
                  conflictingUserNames.push(assignment.user.name);
                }
              }
            }

            const conflictEvent = conflictingEvents[0];
            const conflictTime = new Date(conflictEvent.date).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              dateStyle: 'short',
              timeStyle: 'short'
            });

            return res.status(409).json({
              error: 'Conflito de horário',
              message: `${conflictingUserNames.join(', ')} já possui compromisso marcado: "${conflictEvent.title}" em ${conflictTime}`,
              conflictingEvent: {
                id: conflictEvent.id,
                title: conflictEvent.title,
                date: conflictEvent.date,
                endDate: conflictEvent.endDate
              }
            });
          }
        }
      }

      // Gerar/atualizar link do Google Meet se o tipo for GOOGLE_MEET
      let googleMeetLink: string | null | undefined = undefined;
      const finalType = type || event.type;
      if (finalType === 'GOOGLE_MEET') {
        const startDate = date ? new Date(date) : event.date;
        const finalEndDate = endDate
          ? new Date(endDate)
          : (event.endDate || new Date(startDate.getTime() + 60 * 60 * 1000));
        const finalTitle = title || event.title;
        const finalDescription = description !== undefined ? description : (event.description || '');
        googleMeetLink = generateGoogleMeetLink(finalTitle, startDate, finalEndDate, finalDescription);
      } else if (type && type !== 'GOOGLE_MEET') {
        // Se mudou para outro tipo que não seja Google Meet, limpar o link
        googleMeetLink = null;
      }

      // Capturar IDs dos usuários atribuídos antes da atualização (para notificar apenas novos)
      let oldAssignedUserIds: string[] = [];
      if (assignedUserIds !== undefined && Array.isArray(assignedUserIds)) {
        const oldAssignments = await prisma.eventAssignment.findMany({
          where: { eventId: id },
          select: { userId: true }
        });
        oldAssignedUserIds = oldAssignments.map(a => a.userId);

        // Deletar atribuições antigas
        await prisma.eventAssignment.deleteMany({
          where: { eventId: id }
        });

        // Criar novas atribuições
        if (assignedUserIds.length > 0) {
          await prisma.eventAssignment.createMany({
            data: assignedUserIds.map((userId: string) => ({
              eventId: id,
              userId,
              companyId: companyId!, // TAREFA 4.3: Isolamento de tenant direto
            })),
          });
        }
      }

      // Guardar estado antigo para auditoria
      const oldEvent = { ...event };

      // Se kanbanStatus for alterado, sincronizar com completed
      let finalCompleted = completed;
      if (kanbanStatus !== undefined) {
        if (kanbanStatus === 'DONE') {
          finalCompleted = true;
        } else if (kanbanStatus === 'TODO' || kanbanStatus === 'IN_PROGRESS') {
          finalCompleted = false;
        }
      }

      const updatedEvent = await prisma.scheduleEvent.update({
        where: { id },
        data: {
          title,
          description,
          type,
          priority: priority || undefined,
          date: date ? new Date(date) : undefined,
          endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
          clientId: clientId !== undefined ? (clientId || null) : undefined,
          caseId: caseId !== undefined ? (caseId || null) : undefined,
          completed: finalCompleted !== undefined ? finalCompleted : undefined,
          kanbanStatus: kanbanStatus !== undefined ? kanbanStatus : undefined,
          googleMeetLink: googleMeetLink !== undefined ? googleMeetLink : undefined,
        },
        include: {
          client: {
            select: { id: true, name: true, cpf: true }
          },
          case: {
            select: { id: true, processNumber: true, subject: true }
          },
          user: {
            select: { id: true, name: true }
          },
          assignedUsers: {
            include: {
              user: {
                select: { id: true, name: true, email: true, telegramChatId: true }
              }
            }
          }
        }
      });

      // Log de auditoria
      await auditLogService.logScheduleEventUpdate(oldEvent, updatedEvent, req);

      // SINCRONIZAÇÃO PRAZO → CASE: Se atualizou um evento tipo PRAZO vinculado a um processo, atualizar Case.deadline
      const updatedCaseId = updatedEvent.caseId;
      if (updatedEvent.type === 'PRAZO' && updatedCaseId) {
        try {
          await prisma.case.update({
            where: { id: updatedCaseId },
            data: {
              deadline: updatedEvent.date,
              deadlineCompleted: updatedEvent.completed,
              deadlineCompletedAt: updatedEvent.completed ? new Date() : null,
            },
          });
          appLogger.info('Sincronização PRAZO→Case: deadline atualizado via update', { eventId: updatedEvent.id, caseId: updatedCaseId });
        } catch (syncError) {
          appLogger.error('Erro ao sincronizar prazo com Case', syncError as Error, { eventId: updatedEvent.id, caseId: updatedCaseId });
        }
      }

      // Enviar email de notificação para NOVOS usuários atribuídos
      if (assignedUserIds !== undefined && Array.isArray(assignedUserIds) && updatedEvent.assignedUsers && updatedEvent.assignedUsers.length > 0) {
        // Identificar usuários novos (que não estavam atribuídos antes)
        const newUserIds = assignedUserIds.filter((uid: string) => !oldAssignedUserIds.includes(uid));

        if (newUserIds.length > 0) {
          // Buscar nome do usuário que fez a atribuição e nome da empresa
          const updater = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { name: true, company: { select: { name: true } } }
          });
          const updaterName = updater?.name || 'Sistema';
          const companyName = updater?.company?.name;

          for (const assignment of updatedEvent.assignedUsers) {
            // Enviar email apenas para usuários novos
            if (!newUserIds.includes(assignment.user.id)) continue;

            // Enviar email de forma assíncrona (não bloqueia a resposta)
            sendEventAssignmentNotification(
              assignment.user.email!,
              assignment.user.name,
              updatedEvent.title,
              updatedEvent.date,
              updatedEvent.type,
              updatedEvent.description,
              updaterName,
              companyName
            ).catch(err => {
              appLogger.error('Erro ao enviar email de atribuição de evento', err as Error, {
                eventId: updatedEvent.id,
                userId: assignment.user.id
              });
            });

            // Enviar notificação Telegram para usuários novos atribuídos (se tiver telegramChatId)
            if (assignment.user.telegramChatId) {
              enqueueTelegramEventNotification({
                companyId: companyId!,
                recipientType: 'user',
                chatId: assignment.user.telegramChatId,
                eventTitle: updatedEvent.title,
                eventDate: updatedEvent.date.toISOString(),
                eventType: updatedEvent.type,
                companyName: companyName || 'Sua Empresa',
              }).catch(err => {
                appLogger.error('Erro ao enfileirar notificação Telegram', err as Error, {
                  eventId: updatedEvent.id,
                  userId: assignment.user.id
                });
              });
            }
          }
        }
      }

      // Google Calendar Sync: Atualizar/Criar/Remover eventos no Google Calendar
      const eventData = {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date,
        endDate: updatedEvent.endDate,
        type: updatedEvent.type,
        priority: updatedEvent.priority,
        googleMeetLink: updatedEvent.googleMeetLink,
      };

      // Buscar sincronizações existentes
      const existingSyncs = await prisma.scheduleEventGoogleSync.findMany({
        where: { eventId: updatedEvent.id },
      });
      const existingSyncMap = new Map(existingSyncs.map(s => [s.userId, s]));

      // Determinar usuários que devem ter o evento sincronizado
      const usersToSync = new Set<string>();
      if (updatedEvent.createdBy) usersToSync.add(updatedEvent.createdBy);

      // Buscar usuários atribuídos atuais
      const currentAssignments = await prisma.eventAssignment.findMany({
        where: { eventId: updatedEvent.id },
        select: { userId: true },
      });
      currentAssignments.forEach(a => usersToSync.add(a.userId));

      // Atualizar ou criar sincronizações
      for (const userId of usersToSync) {
        try {
          const isSyncEnabled = await googleCalendarService.isSyncEnabled(userId);
          if (!isSyncEnabled) continue;

          const existingSync = existingSyncMap.get(userId);

          if (existingSync) {
            // Atualizar evento existente
            await googleCalendarService.updateEvent(userId, existingSync.googleEventId, eventData);
          } else {
            // Criar novo evento
            const googleEventId = await googleCalendarService.createEvent(userId, eventData);
            if (googleEventId) {
              await prisma.scheduleEventGoogleSync.create({
                data: { eventId: updatedEvent.id, userId, googleEventId },
              });
            }
          }
        } catch (syncError) {
          appLogger.error('Erro ao sincronizar com Google Calendar', syncError as Error, { userId });
        }
      }

      // Remover sincronizações de usuários que não estão mais envolvidos
      for (const [syncUserId, syncRecord] of existingSyncMap) {
        if (!usersToSync.has(syncUserId)) {
          try {
            const isSyncEnabled = await googleCalendarService.isSyncEnabled(syncUserId);
            if (isSyncEnabled) {
              await googleCalendarService.deleteEvent(syncUserId, syncRecord.googleEventId);
            }
            await prisma.scheduleEventGoogleSync.delete({ where: { id: syncRecord.id } });
          } catch (syncError) {
            appLogger.error('Erro ao remover do Google Calendar', syncError as Error, { userId: syncUserId });
          }
        }
      }

      res.json(updatedEvent);
    } catch (error) {
      appLogger.error('Erro ao atualizar evento', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const event = await prisma.scheduleEvent.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }

      // Google Calendar Sync: Remover evento de todos os Google Calendars sincronizados
      const syncs = await prisma.scheduleEventGoogleSync.findMany({
        where: { eventId: id },
      });

      for (const syncRecord of syncs) {
        try {
          const isSyncEnabled = await googleCalendarService.isSyncEnabled(syncRecord.userId);
          if (isSyncEnabled) {
            await googleCalendarService.deleteEvent(syncRecord.userId, syncRecord.googleEventId);
          }
        } catch (syncError) {
          appLogger.error('Erro ao remover do Google Calendar', syncError as Error, { userId: syncRecord.userId });
        }
      }

      // Fallback: também tentar remover pelo campo legado se existir
      if (event.createdBy && event.googleEventId) {
        const alreadyDeleted = syncs.some(s => s.userId === event.createdBy && s.googleEventId === event.googleEventId);
        if (!alreadyDeleted) {
          try {
            const isSyncEnabled = await googleCalendarService.isSyncEnabled(event.createdBy);
            if (isSyncEnabled) {
              await googleCalendarService.deleteEvent(event.createdBy, event.googleEventId);
            }
          } catch (syncError) {
            appLogger.error('Erro ao remover do Google Calendar (legado)', syncError as Error);
          }
        }
      }

      // Log de auditoria antes de deletar
      await auditLogService.logScheduleEventDelete(event, req);

      await prisma.scheduleEvent.delete({
        where: { id },
      });

      res.json({ message: 'Evento excluído com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar evento', error as Error);
      res.status(500).json({ error: 'Erro ao deletar evento' });
    }
  }

  // Marcar evento como concluído/não concluído
  async toggleComplete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const event = await prisma.scheduleEvent.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }

      // Guardar estado antigo para auditoria
      const oldEvent = { ...event };

      const updatedEvent = await prisma.scheduleEvent.update({
        where: { id },
        data: {
          completed: !event.completed,
        },
      });

      // Log de auditoria
      await auditLogService.logScheduleEventUpdate(oldEvent, updatedEvent, req);

      // SINCRONIZAÇÃO PRAZO → CASE: Se toggle em evento tipo PRAZO vinculado a processo, atualizar Case.deadlineCompleted
      if (event.type === 'PRAZO' && event.caseId) {
        try {
          await prisma.case.update({
            where: { id: event.caseId },
            data: {
              deadlineCompleted: updatedEvent.completed,
              deadlineCompletedAt: updatedEvent.completed ? new Date() : null,
            },
          });
          appLogger.info('Sincronização PRAZO→Case: deadlineCompleted atualizado via toggle', { eventId: event.id, caseId: event.caseId });
        } catch (syncError) {
          appLogger.error('Erro ao sincronizar toggle prazo com Case', syncError as Error, { eventId: event.id, caseId: event.caseId });
        }
      }

      res.json(updatedEvent);
    } catch (error) {
      appLogger.error('Erro ao atualizar status do evento', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar status do evento' });
    }
  }

  // Listar próximos eventos (para dashboard)
  async upcoming(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { limit = 5 } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Construir filtro base
      const where: any = {
        companyId,
        completed: false,
        date: {
          gte: new Date(), // Eventos futuros
        },
      };

      // Visibilidade baseada em role:
      // - USER ve apenas eventos onde esta atribuido ou que criou
      if (userRole === 'USER') {
        where.OR = [
          { createdBy: userId },
          { assignedUsers: { some: { userId: userId } } },
        ];
      }

      const events = await prisma.scheduleEvent.findMany({
        where,
        take: Number(limit),
        orderBy: { date: 'asc' },
        include: {
          client: {
            select: { id: true, name: true }
          },
          case: {
            select: { id: true, processNumber: true }
          },
        },
      });

      res.json(events);
    } catch (error) {
      appLogger.error('Erro ao buscar próximos eventos', error as Error);
      res.status(500).json({ error: 'Erro ao buscar próximos eventos' });
    }
  }

  // Obter tarefas vencendo hoje (para notificação no sidebar)
  async getTasksDueToday(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Usar query raw SQL para comparar apenas a data (ignorando timezone)
      // Visibilidade baseada em role:
      // - ADMIN e SUPER_ADMIN veem todas as tarefas
      // - USER ve apenas tarefas onde esta atribuido ou que criou
      let tasks: Array<{ id: string; title: string; date: Date; }>;

      if (userRole === 'USER') {
        tasks = await prisma.$queryRaw<Array<{
          id: string;
          title: string;
          date: Date;
        }>>`
          SELECT DISTINCT se.id, se.title, se.date
          FROM schedule_events se
          LEFT JOIN event_assignments ea ON se.id = ea."eventId"
          WHERE se."companyId" = ${companyId}
            AND se.type = 'TAREFA'
            AND se.completed = false
            AND se.date IS NOT NULL
            AND DATE(se.date) = CURRENT_DATE
            AND (se."createdBy" = ${userId} OR ea."userId" = ${userId})
          ORDER BY se.date ASC
        `;
      } else {
        tasks = await prisma.$queryRaw<Array<{
          id: string;
          title: string;
          date: Date;
        }>>`
          SELECT id, title, date
          FROM schedule_events
          WHERE "companyId" = ${companyId}
            AND type = 'TAREFA'
            AND completed = false
            AND date IS NOT NULL
            AND DATE(date) = CURRENT_DATE
          ORDER BY date ASC
        `;
      }

      res.json({
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar tarefas vencendo hoje', error as Error);
      res.status(500).json({ error: 'Erro ao buscar tarefas vencendo hoje' });
    }
  }

  // Exportar agenda para PDF
  async exportPDF(req: AuthRequest, res: Response) {
    try {
      const { search, type, completed, clientId, caseId, startDate, endDate } = req.query;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
          { client: { name: { contains: String(search), mode: 'insensitive' as const } } },
        ];
      }

      if (type) where.type = type;
      if (completed !== undefined) where.completed = completed === 'true';
      if (clientId) where.clientId = String(clientId);
      if (caseId) where.caseId = String(caseId);

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(String(startDate));
        if (endDate) {
          // Ajustar endDate para incluir o final do dia (23:59:59.999)
          const parsedEndDate = new Date(String(endDate));
          parsedEndDate.setHours(23, 59, 59, 999);
          where.date.lte = parsedEndDate;
        }
      }

      // Buscar dados da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
        },
      });

      const events = await prisma.scheduleEvent.findMany({
        where,
        orderBy: { date: 'asc' },
        include: {
          client: { select: { name: true } },
          case: { select: { processNumber: true } },
          assignedUsers: {
            include: {
              user: { select: { name: true } }
            }
          }
        },
      });

      // Mapeamento de tipos e prioridades
      const typeLabels: Record<string, string> = {
        'COMPROMISSO': 'Compromisso',
        'TAREFA': 'Tarefa',
        'PRAZO': 'Prazo',
        'AUDIENCIA': 'Audiência',
        'GOOGLE_MEET': 'Google Meet',
      };

      const priorityLabels: Record<string, string> = {
        'BAIXA': 'Baixa',
        'MEDIA': 'Média',
        'ALTA': 'Alta',
        'URGENTE': 'Urgente',
      };

      // Generate PDF using PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=agenda.pdf');

      doc.pipe(res);

      // ==================== HEADER MODERNO ====================
      pdfStyles.addHeader(doc, 'Agenda', `Total de eventos: ${events.length}`, company?.name);

      // ==================== DADOS DA EMPRESA ====================
      if (company) {
        doc.fontSize(pdfStyles.fonts.small).fillColor(pdfStyles.colors.gray);
        const companyInfo = [];
        if (company.address) companyInfo.push(company.address);
        if (company.city) companyInfo.push(company.city);
        if (company.state) companyInfo.push(company.state);
        if (company.phone) companyInfo.push(`Tel: ${company.phone}`);
        if (company.email) companyInfo.push(company.email);
        doc.text(companyInfo.join(' | '), { align: 'center' });
        doc.fillColor(pdfStyles.colors.black);
        doc.moveDown(1);
      }

      // ==================== RESUMO ====================
      const pendingCount = events.filter(e => !e.completed).length;
      const completedCount = events.filter(e => e.completed).length;
      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const cardWidth = (pageWidth - margin * 2 - 20) / 3;

      pdfStyles.addSummaryCard(doc, margin, doc.y, cardWidth, 50, 'Total', `${events.length}`, pdfStyles.colors.cardBlue);      // Azul suave
      pdfStyles.addSummaryCard(doc, margin + cardWidth + 10, doc.y - 50, cardWidth, 50, 'Pendentes', `${pendingCount}`, pdfStyles.colors.cardOrange);  // Laranja suave
      pdfStyles.addSummaryCard(doc, margin + (cardWidth + 10) * 2, doc.y - 50, cardWidth, 50, 'Concluídos', `${completedCount}`, pdfStyles.colors.cardGreen); // Verde suave

      doc.y += 20;
      doc.moveDown(1);

      // ==================== LISTA DE EVENTOS ====================
      pdfStyles.addSection(doc, 'Eventos');

      events.forEach((event, index) => {
        // Verificar se precisa de nova página
        if (doc.y > doc.page.height - 150) {
          doc.addPage();
          doc.y = doc.page.margins.top;
        }

        const date = new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const time = new Date(event.date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        const typeLabel = typeLabels[event.type] || event.type;
        const priorityLabel = priorityLabels[event.priority || 'MEDIA'] || 'Média';
        const status = event.completed ? 'Concluído' : 'Pendente';
        const clientName = event.client?.name || '-';
        const processNum = event.case?.processNumber || '-';
        const assignedNames = event.assignedUsers?.map(a => a.user.name).join(', ') || '-';

        // Título do evento com número
        doc.fontSize(pdfStyles.fonts.heading).fillColor(pdfStyles.colors.primary);
        doc.text(`${index + 1}. ${event.title}`);
        doc.fillColor(pdfStyles.colors.black);

        doc.fontSize(pdfStyles.fonts.body);
        pdfStyles.addKeyValue(doc, 'Data/Hora', `${date} às ${time}`, { indent: 15 });
        pdfStyles.addKeyValue(doc, 'Tipo', `${typeLabel} | Prioridade: ${priorityLabel}`, { indent: 15 });

        // Status com cor
        doc.fontSize(pdfStyles.fonts.body).fillColor(pdfStyles.colors.gray);
        doc.text('Status: ', margin + 15, doc.y, { continued: true });
        doc.fillColor(event.completed ? pdfStyles.colors.success : pdfStyles.colors.warning);
        doc.text(status);
        doc.fillColor(pdfStyles.colors.black);

        pdfStyles.addKeyValue(doc, 'Cliente', clientName, { indent: 15 });
        pdfStyles.addKeyValue(doc, 'Processo', processNum, { indent: 15 });
        pdfStyles.addKeyValue(doc, 'Responsável(is)', assignedNames, { indent: 15 });

        if (event.description) {
          pdfStyles.addKeyValue(doc, 'Descrição', event.description, { indent: 15 });
        }

        pdfStyles.addDivider(doc, 'dashed');
      });

      // Adicionar rodapés a todas as páginas
      pdfStyles.addFootersToAllPages(doc);

      doc.end();
    } catch (error) {
      appLogger.error('Erro ao gerar PDF da agenda', error as Error);
      res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
  }

  // Exportar agenda para CSV
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const { search, type, completed, clientId, caseId, startDate, endDate } = req.query;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
          { client: { name: { contains: String(search), mode: 'insensitive' as const } } },
        ];
      }

      if (type) where.type = type;
      if (completed !== undefined) where.completed = completed === 'true';
      if (clientId) where.clientId = String(clientId);
      if (caseId) where.caseId = String(caseId);

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(String(startDate));
        if (endDate) {
          // Ajustar endDate para incluir o final do dia (23:59:59.999)
          const parsedEndDate = new Date(String(endDate));
          parsedEndDate.setHours(23, 59, 59, 999);
          where.date.lte = parsedEndDate;
        }
      }

      const events = await prisma.scheduleEvent.findMany({
        where,
        orderBy: { date: 'asc' },
        include: {
          client: { select: { name: true } },
          case: { select: { processNumber: true } },
          assignedUsers: {
            include: {
              user: { select: { name: true } }
            }
          }
        },
      });

      // Mapeamento de tipos e prioridades
      const typeLabels: Record<string, string> = {
        'COMPROMISSO': 'Compromisso',
        'TAREFA': 'Tarefa',
        'PRAZO': 'Prazo',
        'AUDIENCIA': 'Audiência',
        'GOOGLE_MEET': 'Google Meet',
      };

      const priorityLabels: Record<string, string> = {
        'BAIXA': 'Baixa',
        'MEDIA': 'Média',
        'ALTA': 'Alta',
        'URGENTE': 'Urgente',
      };

      // Generate CSV
      const csvHeader = 'Data,Horário,Título,Tipo,Prioridade,Cliente,Processo,Responsável,Status,Descrição\n';
      const csvRows = events.map(event => {
        const date = new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const time = new Date(event.date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        const title = `"${(event.title || '').replace(/"/g, '""')}"`;
        const typeLabel = typeLabels[event.type] || event.type;
        const priorityLabel = priorityLabels[event.priority || 'MEDIA'] || 'Média';
        const clientName = `"${(event.client?.name || '').replace(/"/g, '""')}"`;
        const processNum = event.case?.processNumber || '';
        const assignedNames = `"${(event.assignedUsers?.map(a => a.user.name).join(', ') || '').replace(/"/g, '""')}"`;
        const status = event.completed ? 'Concluído' : 'Pendente';
        const description = `"${(event.description || '').replace(/"/g, '""')}"`;

        return `${date},${time},${title},${typeLabel},${priorityLabel},${clientName},${processNum},${assignedNames},${status},${description}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=agenda.csv');
      res.send('\ufeff' + csv); // BOM for Excel UTF-8 recognition
    } catch (error) {
      appLogger.error('Erro ao gerar CSV da agenda', error as Error);
      res.status(500).json({ error: 'Erro ao gerar CSV' });
    }
  }

  // Importar eventos de CSV (via fila em background)
  async importCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
      }

      // Parse CSV para contar linhas
      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV deve conter cabeçalho e pelo menos uma linha de dados' });
      }

      const totalRows = lines.length - 1; // -1 para excluir header

      // Enfileirar job de importação
      const jobId = await enqueueCsvImport('import-schedule', companyId, userId, csvContent, totalRows);

      appLogger.info('Schedule CSV import job enqueued', { jobId, companyId, totalRows });

      res.status(202).json({
        message: 'Importação iniciada em background',
        jobId,
        totalRows,
        statusUrl: `/schedule/import/status/${jobId}`,
      });
    } catch (error) {
      appLogger.error('Erro ao enfileirar importação CSV de eventos', error as Error);
      res.status(500).json({ error: 'Erro ao iniciar importação CSV' });
    }
  }

  // Verificar status da importação
  async getImportStatusEndpoint(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se o jobId pertence à empresa do usuário
      if (!jobId.includes(companyId)) {
        return res.status(403).json({ error: 'Acesso negado a este job' });
      }

      const status = await getImportStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: 'Job não encontrado ou expirado' });
      }

      res.json(status);
    } catch (error) {
      appLogger.error('Erro ao buscar status de importação', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status' });
    }
  }

  // Helper para parse de linha CSV (lida com campos entre aspas) - mantido para compatibilidade
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Enviar confirmação de agendamento via WhatsApp
  async sendWhatsAppConfirmation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar evento com cliente
      const event = await prisma.scheduleEvent.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true }
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento não encontrado' });
      }

      if (!event.client) {
        return res.status(400).json({ error: 'Este evento não possui cliente associado' });
      }

      if (!event.client.phone) {
        return res.status(400).json({ error: 'Cliente não possui telefone cadastrado' });
      }

      // Mapear tipo de evento para texto legível
      const eventTypeLabels: Record<string, string> = {
        'COMPROMISSO': 'Compromisso',
        'TAREFA': 'Tarefa',
        'PRAZO': 'Prazo',
        'AUDIENCIA': 'Audiência',
        'PERICIA': 'Perícia',
        'GOOGLE_MEET': 'Google Meet',
      };

      const eventTypeLabel = eventTypeLabels[event.type] || event.type;

      // Formatar data e hora
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      });
      const formattedTime = eventDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      // Enviar mensagem via WhatsApp
      // Template atual tem 3 vars: {{1}}=nome, {{2}}=data, {{3}}=horario
      const result = await whatsappService.sendTemplate({
        companyId,
        phone: event.client.phone,
        templateName: 'confirmacao_de_agendamento',
        variables: {
          nome: event.client.name,
          data: formattedDate,
          horario: formattedTime,
        },
        eventId: event.id,
        clientId: event.client.id,
        messageType: 'REMINDER',
      });

      if (!result.success) {
        return res.status(400).json({
          error: 'Falha ao enviar mensagem WhatsApp',
          details: result.error,
        });
      }

      appLogger.info('WhatsApp: Confirmação de agendamento enviada', {
        eventId: event.id,
        clientId: event.client.id,
        messageId: result.messageId,
      });

      res.json({
        success: true,
        message: 'Mensagem de confirmação enviada com sucesso',
        messageId: result.messageId,
      });
    } catch (error) {
      appLogger.error('Erro ao enviar confirmação de agendamento via WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao enviar confirmação de agendamento' });
    }
  }
}

export default new ScheduleController();
