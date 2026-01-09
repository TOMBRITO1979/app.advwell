import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class ClientMessageController {
  // Listar mensagens de um cliente (para o portal)
  async listForClient(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      // Buscar o usuário e verificar se é um cliente do portal
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { linkedClient: true },
      });

      if (!user?.clientId || !user.linkedClient || !user.companyId) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }

      const clientId = user.clientId;
      const companyId = user.companyId;

      const messages = await prisma.clientMessage.findMany({
        where: {
          clientId,
          companyId,
          parentId: { equals: null }, // Apenas mensagens raiz (não respostas)
        },
        include: {
          creator: {
            select: { id: true, name: true },
          },
          replies: {
            include: {
              creator: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(messages);
    } catch (error) {
      logger.error('Erro ao listar mensagens do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
  }

  // Listar mensagens de todos os clientes (para o escritório)
  async listForOffice(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { clientId, unreadOnly } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = {
        companyId,
        parentId: { equals: null }, // Apenas mensagens raiz
      };

      if (clientId) {
        where.clientId = clientId;
      }

      if (unreadOnly === 'true') {
        where.sender = 'CLIENT';
        where.readAt = null;
      }

      const messages = await prisma.clientMessage.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true },
          },
          replies: {
            include: {
              creator: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(messages);
    } catch (error) {
      logger.error('Erro ao listar mensagens do escritório:', error as Error);
      res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
  }

  // Enviar mensagem (cliente)
  async sendFromClient(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { subject, content, parentId } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
      }

      // Buscar o usuário e verificar se é um cliente do portal
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { linkedClient: true },
      });

      if (!user?.clientId || !user.linkedClient || !user.companyId) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }

      const message = await prisma.clientMessage.create({
        data: {
          companyId: user.companyId,
          clientId: user.clientId,
          sender: 'CLIENT',
          subject: subject?.trim() || null,
          content: content.trim(),
          parentId: parentId || null,
        },
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
      });

      res.status(201).json(message);
    } catch (error) {
      logger.error('Erro ao enviar mensagem do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }

  // Enviar mensagem (escritório)
  async sendFromOffice(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { clientId, subject, content, parentId } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!clientId) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório' });
      }

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
      }

      // Verificar se o cliente pertence à empresa
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const message = await prisma.clientMessage.create({
        data: {
          companyId,
          clientId,
          sender: 'OFFICE',
          subject: subject?.trim() || null,
          content: content.trim(),
          parentId: parentId || null,
          createdBy: userId,
        },
        include: {
          client: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, name: true },
          },
        },
      });

      res.status(201).json(message);
    } catch (error) {
      logger.error('Erro ao enviar mensagem do escritório:', error as Error);
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }

  // Marcar mensagem como lida
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se a mensagem pertence à empresa
      const message = await prisma.clientMessage.findFirst({
        where: { id: messageId, companyId },
      });

      if (!message) {
        return res.status(404).json({ error: 'Mensagem não encontrada' });
      }

      // Só marca como lida se ainda não foi lida
      if (!message.readAt) {
        await prisma.clientMessage.update({
          where: { id: messageId },
          data: {
            readAt: new Date(),
            readBy: userId,
          },
        });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida:', error as Error);
      res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
  }

  // Contar mensagens não lidas (para badge no menu)
  async countUnread(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const count = await prisma.clientMessage.count({
        where: {
          companyId,
          sender: 'CLIENT',
          readAt: null,
        },
      });

      res.json({ count });
    } catch (error) {
      logger.error('Erro ao contar mensagens não lidas:', error as Error);
      res.status(500).json({ error: 'Erro ao contar mensagens' });
    }
  }
}

export default new ClientMessageController();
