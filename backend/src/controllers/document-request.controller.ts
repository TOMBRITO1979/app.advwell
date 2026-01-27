import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import {
  sendEmailReminder,
  sendWhatsAppReminder,
  type DocumentRequestForReminder,
} from '../jobs/document-request-reminder.job';

/**
 * Controller para solicitações de documentos aos clientes
 * Permite que o escritório solicite documentos com prazo e envie lembretes automáticos
 */
export class DocumentRequestController {
  /**
   * Criar nova solicitação de documento
   * POST /api/document-requests
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        clientId,
        documentName,
        description,
        internalNotes,
        dueDate,
        notificationChannel,
        emailTemplateId,
        whatsappTemplateId,
        autoRemind = true,
        autoFollowup = true,
      } = req.body;
      const companyId = req.user!.companyId;
      const requestedByUserId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validar campos obrigatórios
      if (!clientId || !documentName || !dueDate) {
        return res.status(400).json({
          error: 'Cliente, nome do documento e prazo são obrigatórios',
        });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Criar a solicitação
      const documentRequest = await prisma.documentRequest.create({
        data: {
          companyId,
          clientId,
          requestedByUserId,
          documentName,
          description: description || null,
          internalNotes: internalNotes || null,
          dueDate: new Date(dueDate + 'T12:00:00Z'),
          notificationChannel: notificationChannel || null,
          emailTemplateId: emailTemplateId || null,
          whatsappTemplateId: whatsappTemplateId || null,
          autoRemind,
          autoFollowup,
          status: 'PENDING',
        },
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
          requestedBy: {
            select: { id: true, name: true },
          },
        },
      });

      appLogger.info('Solicitação de documento criada', {
        id: documentRequest.id,
        clientId,
        documentName,
        companyId,
      });

      // TODO: Enviar notificação inicial via WhatsApp/Email baseado no canal selecionado

      res.status(201).json(documentRequest);
    } catch (error) {
      appLogger.error('Erro ao criar solicitação de documento', error as Error);
      res.status(500).json({ error: 'Erro ao criar solicitação de documento' });
    }
  }

  /**
   * Listar solicitações de documentos com filtros
   * GET /api/document-requests
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { clientId, status, startDate, endDate, overdue } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (clientId) {
        where.clientId = clientId as string;
      }

      if (status) {
        where.status = status as string;
      }

      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) {
          where.dueDate.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.dueDate.lte = new Date(endDate as string);
        }
      }

      // Filtrar apenas vencidas
      if (overdue === 'true') {
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ['RECEIVED', 'CANCELLED'] };
      }

      const documentRequests = await prisma.documentRequest.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
          requestedBy: {
            select: { id: true, name: true },
          },
          receivedDocument: {
            select: { id: true, name: true, fileUrl: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json(documentRequests);
    } catch (error) {
      appLogger.error('Erro ao listar solicitações de documentos', error as Error);
      res.status(500).json({ error: 'Erro ao listar solicitações de documentos' });
    }
  }

  /**
   * Obter detalhes de uma solicitação
   * GET /api/document-requests/:id
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const documentRequest = await prisma.documentRequest.findFirst({
        where: { id, companyId },
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
          requestedBy: {
            select: { id: true, name: true },
          },
          receivedDocument: true,
        },
      });

      if (!documentRequest) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      res.json(documentRequest);
    } catch (error) {
      appLogger.error('Erro ao obter solicitação de documento', error as Error);
      res.status(500).json({ error: 'Erro ao obter solicitação de documento' });
    }
  }

  /**
   * Atualizar solicitação de documento
   * PUT /api/document-requests/:id
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        documentName,
        description,
        internalNotes,
        dueDate,
        notificationChannel,
        emailTemplateId,
        whatsappTemplateId,
        autoRemind,
        autoFollowup,
      } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se a solicitação existe e pertence à empresa
      const existing = await prisma.documentRequest.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Não permitir edição de solicitações já recebidas ou canceladas
      if (existing.status === 'RECEIVED' || existing.status === 'CANCELLED') {
        return res.status(400).json({
          error: 'Não é possível editar solicitações já recebidas ou canceladas',
        });
      }

      const updated = await prisma.documentRequest.update({
        where: { id },
        data: {
          documentName: documentName !== undefined ? documentName : undefined,
          description: description !== undefined ? description : undefined,
          internalNotes: internalNotes !== undefined ? internalNotes : undefined,
          dueDate: dueDate ? new Date(dueDate + 'T12:00:00Z') : undefined,
          notificationChannel: notificationChannel !== undefined ? notificationChannel : undefined,
          emailTemplateId: emailTemplateId !== undefined ? emailTemplateId : undefined,
          whatsappTemplateId: whatsappTemplateId !== undefined ? whatsappTemplateId : undefined,
          autoRemind: autoRemind !== undefined ? autoRemind : undefined,
          autoFollowup: autoFollowup !== undefined ? autoFollowup : undefined,
        },
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
          requestedBy: {
            select: { id: true, name: true },
          },
        },
      });

      appLogger.info('Solicitação de documento atualizada', { id, companyId });

      res.json(updated);
    } catch (error) {
      appLogger.error('Erro ao atualizar solicitação de documento', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar solicitação de documento' });
    }
  }

  /**
   * Cancelar solicitação de documento
   * DELETE /api/document-requests/:id
   */
  async cancel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se a solicitação existe e pertence à empresa
      const existing = await prisma.documentRequest.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Não permitir cancelamento de solicitações já recebidas
      if (existing.status === 'RECEIVED') {
        return res.status(400).json({
          error: 'Não é possível cancelar solicitações já recebidas',
        });
      }

      await prisma.documentRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      appLogger.info('Solicitação de documento cancelada', { id, companyId });

      res.json({ message: 'Solicitação cancelada com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao cancelar solicitação de documento', error as Error);
      res.status(500).json({ error: 'Erro ao cancelar solicitação de documento' });
    }
  }

  /**
   * Enviar lembrete manual
   * POST /api/document-requests/:id/reminder
   */
  async sendReminder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const documentRequest = await prisma.documentRequest.findFirst({
        where: { id, companyId },
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

      if (!documentRequest) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Não enviar lembrete para solicitações já recebidas ou canceladas
      if (documentRequest.status === 'RECEIVED' || documentRequest.status === 'CANCELLED') {
        return res.status(400).json({
          error: 'Não é possível enviar lembrete para solicitações já finalizadas',
        });
      }

      // Preparar objeto para envio (formato esperado pelas funções de envio)
      const requestForReminder: DocumentRequestForReminder = {
        id: documentRequest.id,
        documentName: documentRequest.documentName,
        description: documentRequest.description,
        dueDate: documentRequest.dueDate,
        status: documentRequest.status,
        notificationChannel: documentRequest.notificationChannel,
        whatsappTemplateId: documentRequest.whatsappTemplateId,
        autoRemind: documentRequest.autoRemind,
        reminderCount: documentRequest.reminderCount,
        lastReminderAt: documentRequest.lastReminderAt,
        companyId: documentRequest.companyId,
        client: documentRequest.client,
        company: documentRequest.company,
      };

      const isOverdue = new Date(documentRequest.dueDate) < new Date();
      const channel = documentRequest.notificationChannel;
      let emailSent = false;
      let whatsappSent = false;
      const errors: string[] = [];

      // Enviar Email se configurado
      if (channel === 'EMAIL' || channel === 'BOTH' || !channel) {
        if (documentRequest.client.email) {
          try {
            emailSent = await sendEmailReminder(requestForReminder);
            if (!emailSent) {
              errors.push('Email: SMTP não configurado ou erro no envio');
            }
          } catch (err: any) {
            errors.push(`Email: ${err.message}`);
          }
        } else {
          errors.push('Email: Cliente não possui email cadastrado');
        }
      }

      // Enviar WhatsApp se configurado
      if (channel === 'WHATSAPP' || channel === 'BOTH') {
        if (documentRequest.client.phone) {
          try {
            whatsappSent = await sendWhatsAppReminder(requestForReminder, isOverdue);
            if (!whatsappSent) {
              errors.push('WhatsApp: Não configurado ou erro no envio');
            }
          } catch (err: any) {
            errors.push(`WhatsApp: ${err.message}`);
          }
        } else {
          errors.push('WhatsApp: Cliente não possui telefone cadastrado');
        }
      }

      // Se nenhum canal foi enviado com sucesso
      if (!emailSent && !whatsappSent) {
        appLogger.warn('Nenhum lembrete enviado', { id, errors });
        return res.status(400).json({
          error: 'Não foi possível enviar o lembrete',
          details: errors,
        });
      }

      // Atualizar dados do lembrete
      await prisma.documentRequest.update({
        where: { id },
        data: {
          status: 'REMINDED',
          lastReminderAt: new Date(),
          reminderCount: { increment: 1 },
        },
      });

      appLogger.info('Lembrete enviado para solicitação', {
        id,
        clientId: documentRequest.clientId,
        emailSent,
        whatsappSent,
      });

      res.json({
        message: 'Lembrete enviado com sucesso',
        emailSent,
        whatsappSent,
        warnings: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      appLogger.error('Erro ao enviar lembrete', error as Error);
      res.status(500).json({ error: 'Erro ao enviar lembrete' });
    }
  }

  /**
   * Marcar solicitação como recebida
   * POST /api/document-requests/:id/received
   */
  async markAsReceived(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { receivedDocumentId, clientNotes } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const documentRequest = await prisma.documentRequest.findFirst({
        where: { id, companyId },
      });

      if (!documentRequest) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Verificar se já foi recebida
      if (documentRequest.status === 'RECEIVED') {
        return res.status(400).json({ error: 'Esta solicitação já foi marcada como recebida' });
      }

      // Se foi fornecido um documento, verificar se pertence à mesma empresa
      if (receivedDocumentId) {
        const document = await prisma.sharedDocument.findFirst({
          where: { id: receivedDocumentId, companyId },
        });

        if (!document) {
          return res.status(404).json({ error: 'Documento não encontrado' });
        }
      }

      const updated = await prisma.documentRequest.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedDocumentId: receivedDocumentId || null,
          clientNotes: clientNotes || null,
        },
        include: {
          client: {
            select: { id: true, name: true },
          },
          receivedDocument: true,
        },
      });

      appLogger.info('Solicitação marcada como recebida', { id, receivedDocumentId });

      res.json(updated);
    } catch (error) {
      appLogger.error('Erro ao marcar solicitação como recebida', error as Error);
      res.status(500).json({ error: 'Erro ao marcar solicitação como recebida' });
    }
  }

  /**
   * Obter estatísticas de solicitações
   * GET /api/document-requests/stats
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const now = new Date();

      const [total, pending, overdue, received, cancelled] = await Promise.all([
        prisma.documentRequest.count({ where: { companyId } }),
        prisma.documentRequest.count({
          where: { companyId, status: { in: ['PENDING', 'SENT', 'REMINDED'] } },
        }),
        prisma.documentRequest.count({
          where: {
            companyId,
            status: { notIn: ['RECEIVED', 'CANCELLED'] },
            dueDate: { lt: now },
          },
        }),
        prisma.documentRequest.count({ where: { companyId, status: 'RECEIVED' } }),
        prisma.documentRequest.count({ where: { companyId, status: 'CANCELLED' } }),
      ]);

      res.json({
        total,
        pending,
        overdue,
        received,
        cancelled,
      });
    } catch (error) {
      appLogger.error('Erro ao obter estatísticas', error as Error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  }

  /**
   * Listar solicitações vencidas (para dashboard)
   * GET /api/document-requests/overdue
   */
  async listOverdue(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const overdueRequests = await prisma.documentRequest.findMany({
        where: {
          companyId,
          status: { notIn: ['RECEIVED', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      });

      res.json(overdueRequests);
    } catch (error) {
      appLogger.error('Erro ao listar solicitações vencidas', error as Error);
      res.status(500).json({ error: 'Erro ao listar solicitações vencidas' });
    }
  }

  /**
   * Listar solicitações para o portal do cliente
   * GET /api/document-requests/client/:clientId
   */
  async listForClient(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const companyId = req.user!.companyId;
      const userRole = req.user!.role;
      const linkedClientId = req.user!.clientId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Se for CLIENT, só pode ver suas próprias solicitações
      if (userRole === 'CLIENT' && linkedClientId !== clientId) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const documentRequests = await prisma.documentRequest.findMany({
        where: {
          clientId,
          companyId,
          status: { notIn: ['CANCELLED'] }, // Não mostrar canceladas no portal
        },
        select: {
          id: true,
          documentName: true,
          description: true,
          dueDate: true,
          status: true,
          receivedAt: true,
          createdAt: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json(documentRequests);
    } catch (error) {
      appLogger.error('Erro ao listar solicitações do cliente', error as Error);
      res.status(500).json({ error: 'Erro ao listar solicitações do cliente' });
    }
  }

  /**
   * Cliente envia documento em resposta à solicitação
   * POST /api/document-requests/:id/submit
   */
  async clientSubmitDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { sharedDocumentId, clientNotes } = req.body;
      const companyId = req.user!.companyId;
      const userRole = req.user!.role;
      const linkedClientId = req.user!.clientId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const documentRequest = await prisma.documentRequest.findFirst({
        where: { id, companyId },
      });

      if (!documentRequest) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Se for CLIENT, verificar se é o dono da solicitação
      if (userRole === 'CLIENT' && linkedClientId !== documentRequest.clientId) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }

      // Verificar se já foi respondida
      if (documentRequest.status === 'RECEIVED') {
        return res.status(400).json({ error: 'Esta solicitação já foi respondida' });
      }

      // Verificar se já foi cancelada
      if (documentRequest.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Esta solicitação foi cancelada' });
      }

      // Verificar se o documento compartilhado existe e pertence ao mesmo cliente
      if (sharedDocumentId) {
        const sharedDoc = await prisma.sharedDocument.findFirst({
          where: {
            id: sharedDocumentId,
            companyId,
            clientId: documentRequest.clientId,
          },
        });

        if (!sharedDoc) {
          return res.status(404).json({ error: 'Documento não encontrado' });
        }
      }

      // Atualizar solicitação
      const updated = await prisma.documentRequest.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedDocumentId: sharedDocumentId || null,
          clientNotes: clientNotes || null,
        },
      });

      appLogger.info('Cliente enviou documento para solicitação', {
        requestId: id,
        clientId: documentRequest.clientId,
        sharedDocumentId,
      });

      res.json({
        message: 'Documento enviado com sucesso',
        request: updated,
      });
    } catch (error) {
      appLogger.error('Erro ao enviar documento', error as Error);
      res.status(500).json({ error: 'Erro ao enviar documento' });
    }
  }
}

export const documentRequestController = new DocumentRequestController();
