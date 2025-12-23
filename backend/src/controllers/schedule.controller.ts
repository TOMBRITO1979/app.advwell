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

      // Filtro de busca unificada: título, descrição, nome do cliente, telefone do cliente ou nome do advogado
      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
          { client: { name: { contains: String(search), mode: 'insensitive' as const } } },
          { client: { phone: { contains: String(search), mode: 'insensitive' as const } } },
          { assignedUsers: { some: { user: { name: { contains: String(search), mode: 'insensitive' as const } } } } },
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

  // Obter tarefas vencendo hoje (para notificação no sidebar)
  async getTasksDueToday(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Usar query raw SQL para comparar apenas a data (ignorando timezone)
      const tasks = await prisma.$queryRaw<Array<{
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

      res.json({
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error('Erro ao buscar tarefas vencendo hoje:', error);
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
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=agenda.pdf');

      doc.pipe(res);

      // Header com dados da empresa
      if (company) {
        doc.fontSize(16).text(company.name, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9);

        if (company.address || company.city || company.state) {
          const addressParts = [];
          if (company.address) addressParts.push(company.address);
          if (company.city) addressParts.push(company.city);
          if (company.state) addressParts.push(company.state);
          if (company.zipCode) addressParts.push(`CEP: ${company.zipCode}`);
          doc.text(addressParts.join(' - '), { align: 'center' });
        }

        const contactParts = [];
        if (company.phone) contactParts.push(`Tel: ${company.phone}`);
        if (company.email) contactParts.push(company.email);
        if (contactParts.length > 0) {
          doc.text(contactParts.join(' | '), { align: 'center' });
        }

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
      }

      // Título do relatório
      doc.fontSize(20).text('Agenda', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Total de eventos: ${events.length}`, { align: 'center' });
      doc.moveDown(2);

      // Lista de eventos
      events.forEach((event, index) => {
        doc.fontSize(10);
        const date = new Date(event.date).toLocaleDateString('pt-BR');
        const time = new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const typeLabel = typeLabels[event.type] || event.type;
        const priorityLabel = priorityLabels[event.priority || 'MEDIA'] || 'Média';
        const status = event.completed ? 'Concluído' : 'Pendente';
        const clientName = event.client?.name || '-';
        const processNum = event.case?.processNumber || '-';
        const assignedNames = event.assignedUsers?.map(a => a.user.name).join(', ') || '-';

        doc.font('Helvetica-Bold').text(`${index + 1}. ${event.title}`, { continued: false });
        doc.font('Helvetica');
        doc.text(`   Data: ${date} às ${time}`);
        doc.text(`   Tipo: ${typeLabel} | Prioridade: ${priorityLabel} | Status: ${status}`);
        doc.text(`   Cliente: ${clientName}`);
        doc.text(`   Processo: ${processNum}`);
        doc.text(`   Responsável(is): ${assignedNames}`);
        if (event.description) {
          doc.text(`   Descrição: ${event.description}`);
        }
        doc.moveDown(0.8);

        if ((index + 1) % 8 === 0 && index !== events.length - 1) {
          doc.addPage();
        }
      });

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF da agenda:', error);
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
        const date = new Date(event.date).toLocaleDateString('pt-BR');
        const time = new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
      console.error('Erro ao gerar CSV da agenda:', error);
      res.status(500).json({ error: 'Erro ao gerar CSV' });
    }
  }
}

export default new ScheduleController();
