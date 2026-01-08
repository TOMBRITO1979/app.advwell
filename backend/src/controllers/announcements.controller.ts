import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

export class AnnouncementsController {
  /**
   * Lista todos os anúncios da empresa
   * GET /api/announcements
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { active, clientId, page = 1, limit = 50 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const whereClause: any = { companyId };
      if (active !== undefined) {
        whereClause.active = active === 'true';
      }
      if (clientId) {
        whereClause.clientId = clientId;
      }

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where: whereClause,
          skip,
          take: Number(limit),
          include: {
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { priority: 'desc' },
            { publishedAt: 'desc' },
          ],
        }),
        prisma.announcement.count({ where: whereClause }),
      ]);

      res.json({
        data: announcements,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar anúncios:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar anúncios' });
    }
  }

  /**
   * Busca um anúncio específico
   * GET /api/announcements/:id
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const announcement = await prisma.announcement.findFirst({
        where: { id, companyId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Anúncio não encontrado' });
      }

      res.json(announcement);
    } catch (error) {
      appLogger.error('Erro ao buscar anúncio:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar anúncio' });
    }
  }

  /**
   * Cria um novo anúncio
   * POST /api/announcements
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { title, content, priority, active, publishedAt, expiresAt, clientId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      }

      // Se clientId foi fornecido, validar que pertence à empresa
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId },
        });
        if (!client) {
          return res.status(400).json({ error: 'Cliente não encontrado' });
        }
      }

      const announcement = await prisma.announcement.create({
        data: {
          companyId: companyId!,
          createdBy: userId,
          title,
          content,
          priority: priority || 'NORMAL',
          active: active !== false,
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          clientId: clientId || null,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Anúncio criado', { announcementId: announcement.id, companyId, clientId });

      res.status(201).json(announcement);
    } catch (error) {
      appLogger.error('Erro ao criar anúncio:', error as Error);
      res.status(500).json({ error: 'Erro ao criar anúncio' });
    }
  }

  /**
   * Atualiza um anúncio
   * PUT /api/announcements/:id
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { title, content, priority, active, publishedAt, expiresAt, clientId } = req.body;

      // Verificar se existe e pertence à empresa
      const existing = await prisma.announcement.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Anúncio não encontrado' });
      }

      // Se clientId foi fornecido, validar que pertence à empresa
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId },
        });
        if (!client) {
          return res.status(400).json({ error: 'Cliente não encontrado' });
        }
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;
      if (active !== undefined) updateData.active = active;
      if (publishedAt !== undefined) updateData.publishedAt = new Date(publishedAt);
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (clientId !== undefined) updateData.clientId = clientId || null;

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Anúncio atualizado', { announcementId: id, companyId });

      res.json(announcement);
    } catch (error) {
      appLogger.error('Erro ao atualizar anúncio:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar anúncio' });
    }
  }

  /**
   * Exclui um anúncio
   * DELETE /api/announcements/:id
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se existe e pertence à empresa
      const existing = await prisma.announcement.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Anúncio não encontrado' });
      }

      await prisma.announcement.delete({
        where: { id },
      });

      appLogger.info('Anúncio excluído', { announcementId: id, companyId });

      res.json({ message: 'Anúncio excluído com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir anúncio:', error as Error);
      res.status(500).json({ error: 'Erro ao excluir anúncio' });
    }
  }

  /**
   * Alterna o status ativo/inativo de um anúncio
   * PATCH /api/announcements/:id/toggle
   */
  async toggle(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se existe e pertence à empresa
      const existing = await prisma.announcement.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Anúncio não encontrado' });
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: { active: !existing.active },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Status do anúncio alterado', {
        announcementId: id,
        companyId,
        active: announcement.active,
      });

      res.json(announcement);
    } catch (error) {
      appLogger.error('Erro ao alternar status do anúncio:', error as Error);
      res.status(500).json({ error: 'Erro ao alternar status do anúncio' });
    }
  }
}

export default new AnnouncementsController();
