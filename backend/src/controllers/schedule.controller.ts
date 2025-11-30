import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { generateGoogleMeetLink } from '../utils/googleMeet';

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

      const event = await prisma.scheduleEvent.create({
        data: {
          companyId,
          title,
          description,
          type: type || 'COMPROMISSO',
          priority: priority || 'MEDIA',
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : null,
          clientId: clientId || null,
          caseId: caseId || null,
          createdBy,
          googleMeetLink,
          // Criar relações com usuários atribuídos
          assignedUsers: assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0
            ? {
                create: assignedUserIds.map((userId: string) => ({
                  userId,
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
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      res.status(201).json(event);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      res.status(500).json({ error: 'Erro ao criar evento' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
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

      // Filtro de busca por título ou descrição
      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
        ];
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
          where.date.lte = new Date(String(endDate));
        }
      }

      const [events, total] = await Promise.all([
        prisma.scheduleEvent.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { date: 'asc' },
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
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
        }),
        prisma.scheduleEvent.count({ where })
      ]);

      res.json({
        data: events,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error('Erro ao listar eventos:', error);
      res.status(500).json({ error: 'Erro ao listar eventos' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const event = await prisma.scheduleEvent.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
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
      console.error('Erro ao buscar evento:', error);
      res.status(500).json({ error: 'Erro ao buscar evento' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        title, description, type, priority, date, endDate, clientId, caseId, completed, assignedUserIds
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

      // Atualizar usuários atribuídos se fornecido
      if (assignedUserIds !== undefined && Array.isArray(assignedUserIds)) {
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
            })),
          });
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
          endDate: endDate ? new Date(endDate) : null,
          clientId: clientId || null,
          caseId: caseId || null,
          completed: completed !== undefined ? completed : undefined,
          googleMeetLink: googleMeetLink,
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
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
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

      await prisma.scheduleEvent.delete({
        where: { id },
      });

      res.json({ message: 'Evento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
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

      const updatedEvent = await prisma.scheduleEvent.update({
        where: { id },
        data: {
          completed: !event.completed,
        },
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error('Erro ao atualizar status do evento:', error);
      res.status(500).json({ error: 'Erro ao atualizar status do evento' });
    }
  }

  // Listar próximos eventos (para dashboard)
  async upcoming(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { limit = 5 } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const events = await prisma.scheduleEvent.findMany({
        where: {
          companyId,
          completed: false,
          date: {
            gte: new Date(), // Eventos futuros
          },
        },
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
      console.error('Erro ao buscar próximos eventos:', error);
      res.status(500).json({ error: 'Erro ao buscar próximos eventos' });
    }
  }
}

export default new ScheduleController();
