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
      const { active } = req.query;

      const whereClause: any = { companyId };
      if (active !== undefined) {
        whereClause.active = active === 'true';
      }

      const announcements = await prisma.announcement.findMany({
        where: whereClause,
        include: {
          creator: {
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
      });

      res.json(announcements);
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
      const { title, content, priority, active, publishedAt, expiresAt } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
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
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      appLogger.info('Anúncio criado', { announcementId: announcement.id, companyId });

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
      const { title, content, priority, active, publishedAt, expiresAt } = req.body;

      // Verificar se existe e pertence à empresa
      const existing = await prisma.announcement.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Anúncio não encontrado' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;
      if (active !== undefined) updateData.active = active;
      if (publishedAt !== undefined) updateData.publishedAt = new Date(publishedAt);
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

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
