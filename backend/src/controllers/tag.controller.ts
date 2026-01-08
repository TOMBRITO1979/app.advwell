import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';

export class TagController {
  /**
   * List all tags for current company (with usage counts)
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 50 } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const where = { companyId };

      const [tags, total] = await Promise.all([
        prisma.tag.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                clients: true,
                leads: true,
              },
            },
          },
        }),
        prisma.tag.count({ where }),
      ]);

      res.json({
        data: tags,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar tags:', error as Error);
      res.status(500).json({ error: 'Erro ao listar tags' });
    }
  }

  /**
   * Search tags (autocomplete)
   */
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const tags = await prisma.tag.findMany({
        where: {
          companyId,
          ...(q && {
            name: { contains: String(q), mode: 'insensitive' as const },
          }),
        },
        take: 20,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      res.json(tags);
    } catch (error) {
      appLogger.error('Erro ao buscar tags:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar tags' });
    }
  }

  /**
   * Get single tag by ID
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const tag = await prisma.tag.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              clients: true,
              leads: true,
            },
          },
        },
      });

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      res.json(tag);
    } catch (error) {
      appLogger.error('Erro ao buscar tag:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar tag' });
    }
  }

  /**
   * Create new tag
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, color } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
      }

      // Validate color format (hex)
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (color && !colorRegex.test(color)) {
        return res.status(400).json({ error: 'Cor inválida. Use formato hex (ex: #3B82F6)' });
      }

      const sanitizedName = sanitizeString(name.trim()) || name.trim();

      const tag = await prisma.tag.create({
        data: {
          companyId,
          name: sanitizedName,
          color: color || '#3B82F6',
        },
      });

      appLogger.info(`Tag criada: ${tag.name} (${tag.id}) - Empresa: ${companyId}`);

      res.status(201).json(tag);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Já existe uma tag com este nome' });
      }
      appLogger.error('Erro ao criar tag:', error as Error);
      res.status(500).json({ error: 'Erro ao criar tag' });
    }
  }

  /**
   * Update tag
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, color } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const tag = await prisma.tag.findFirst({
        where: { id, companyId },
      });

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
      }

      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (color && !colorRegex.test(color)) {
        return res.status(400).json({ error: 'Cor inválida. Use formato hex (ex: #3B82F6)' });
      }

      const sanitizedName = sanitizeString(name.trim()) || name.trim();

      const updatedTag = await prisma.tag.update({
        where: { id },
        data: {
          name: sanitizedName,
          color: color || tag.color,
        },
      });

      appLogger.info(`Tag atualizada: ${updatedTag.name} (${updatedTag.id}) - Empresa: ${companyId}`);

      res.json(updatedTag);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Já existe uma tag com este nome' });
      }
      appLogger.error('Erro ao atualizar tag:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar tag' });
    }
  }

  /**
   * Delete tag
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const tag = await prisma.tag.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              clients: true,
              leads: true,
            },
          },
        },
      });

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      await prisma.tag.delete({
        where: { id },
      });

      appLogger.info(`Tag excluída: ${tag.name} (${tag.id}) - Empresa: ${companyId}`);

      res.json({ message: 'Tag excluída com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir tag:', error as Error);
      res.status(500).json({ error: 'Erro ao excluir tag' });
    }
  }
}

export default new TagController();
