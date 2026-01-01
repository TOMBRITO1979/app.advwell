import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';

export class PNJController {
  /**
   * Listar PNJs com paginação e busca
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '', status = '', clientId = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        companyId,
        ...(search && {
          OR: [
            { number: { contains: String(search), mode: 'insensitive' as const } },
            { protocol: { contains: String(search), mode: 'insensitive' as const } },
            { title: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }),
        ...(status && status !== 'ALL' && { status: String(status) }),
        ...(clientId && { clientId: String(clientId) }),
      };

      const [pnjs, total] = await Promise.all([
        prisma.pNJ.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                parts: true,
                movements: true,
              },
            },
          },
        }),
        prisma.pNJ.count({ where }),
      ]);

      res.json({
        data: pnjs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar PNJs:', error as Error);
      res.status(500).json({ error: 'Erro ao listar PNJs' });
    }
  }

  /**
   * Buscar PNJ por ID com partes e andamentos
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          parts: {
            orderBy: { createdAt: 'asc' },
          },
          movements: {
            orderBy: { date: 'desc' },
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      res.json(pnj);
    } catch (error) {
      appLogger.error('Erro ao buscar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar PNJ' });
    }
  }

  /**
   * Criar novo PNJ
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { number, protocol, title, description, status, clientId, openDate } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validação: número e título são obrigatórios
      if (!number || !number.trim()) {
        return res.status(400).json({ error: 'Número é obrigatório' });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      // Verificar se cliente existe (se informado)
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId },
        });
        if (!client) {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
      }

      const pnj = await prisma.pNJ.create({
        data: {
          companyId,
          number: number.trim(),
          protocol: protocol?.trim() || null,
          title: sanitizeString(title) || title.trim(),
          description: sanitizeString(description) || null,
          status: status || 'ACTIVE',
          clientId: clientId || null,
          openDate: openDate ? new Date(openDate) : new Date(),
          createdBy: userId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(pnj);
    } catch (error) {
      appLogger.error('Erro ao criar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao criar PNJ' });
    }
  }

  /**
   * Atualizar PNJ
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { number, protocol, title, description, status, clientId, openDate, closeDate } = req.body;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação: número e título são obrigatórios
      if (!number || !number.trim()) {
        return res.status(400).json({ error: 'Número é obrigatório' });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      // Verificar se cliente existe (se informado)
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, companyId: companyId! },
        });
        if (!client) {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
      }

      const updatedPNJ = await prisma.pNJ.update({
        where: { id },
        data: {
          number: number.trim(),
          protocol: protocol?.trim() || null,
          title: sanitizeString(title) || title.trim(),
          description: sanitizeString(description) || null,
          status: status || pnj.status,
          clientId: clientId || null,
          openDate: openDate ? new Date(openDate) : pnj.openDate,
          closeDate: closeDate ? new Date(closeDate) : (status === 'CLOSED' ? new Date() : null),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json(updatedPNJ);
    } catch (error) {
      appLogger.error('Erro ao atualizar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar PNJ' });
    }
  }

  /**
   * Deletar PNJ
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      await prisma.pNJ.delete({
        where: { id },
      });

      res.json({ message: 'PNJ deletado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao deletar PNJ' });
    }
  }

  // ============================================================================
  // PARTES DO PNJ
  // ============================================================================

  /**
   * Adicionar parte ao PNJ
   */
  async addPart(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { name, document, type, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da parte é obrigatório' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Tipo da parte é obrigatório' });
      }

      const part = await prisma.pNJPart.create({
        data: {
          pnjId: id,
          name: sanitizeString(name) || name.trim(),
          document: document?.trim() || null,
          type,
          notes: sanitizeString(notes) || null,
        },
      });

      res.status(201).json(part);
    } catch (error) {
      appLogger.error('Erro ao adicionar parte ao PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao adicionar parte' });
    }
  }

  /**
   * Atualizar parte do PNJ
   */
  async updatePart(req: AuthRequest, res: Response) {
    try {
      const { id, partId } = req.params;
      const companyId = req.user!.companyId;
      const { name, document, type, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se a parte existe
      const part = await prisma.pNJPart.findFirst({
        where: {
          id: partId,
          pnjId: id,
        },
      });

      if (!part) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      // Validação
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da parte é obrigatório' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Tipo da parte é obrigatório' });
      }

      const updatedPart = await prisma.pNJPart.update({
        where: { id: partId },
        data: {
          name: sanitizeString(name) || name.trim(),
          document: document?.trim() || null,
          type,
          notes: sanitizeString(notes) || null,
        },
      });

      res.json(updatedPart);
    } catch (error) {
      appLogger.error('Erro ao atualizar parte do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar parte' });
    }
  }

  /**
   * Remover parte do PNJ
   */
  async removePart(req: AuthRequest, res: Response) {
    try {
      const { id, partId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se a parte existe
      const part = await prisma.pNJPart.findFirst({
        where: {
          id: partId,
          pnjId: id,
        },
      });

      if (!part) {
        return res.status(404).json({ error: 'Parte não encontrada' });
      }

      await prisma.pNJPart.delete({
        where: { id: partId },
      });

      res.json({ message: 'Parte removida com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover parte do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao remover parte' });
    }
  }

  // ============================================================================
  // ANDAMENTOS DO PNJ
  // ============================================================================

  /**
   * Adicionar andamento ao PNJ
   */
  async addMovement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { date, description, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Validação
      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Descrição do andamento é obrigatória' });
      }

      const movement = await prisma.pNJMovement.create({
        data: {
          pnjId: id,
          date: date ? new Date(date) : new Date(),
          description: sanitizeString(description) || description.trim(),
          notes: sanitizeString(notes) || null,
          createdBy: userId,
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

      res.status(201).json(movement);
    } catch (error) {
      appLogger.error('Erro ao adicionar andamento ao PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao adicionar andamento' });
    }
  }

  /**
   * Atualizar andamento do PNJ
   */
  async updateMovement(req: AuthRequest, res: Response) {
    try {
      const { id, movementId } = req.params;
      const companyId = req.user!.companyId;
      const { date, description, notes } = req.body;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se o andamento existe
      const movement = await prisma.pNJMovement.findFirst({
        where: {
          id: movementId,
          pnjId: id,
        },
      });

      if (!movement) {
        return res.status(404).json({ error: 'Andamento não encontrado' });
      }

      // Validação
      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Descrição do andamento é obrigatória' });
      }

      const updatedMovement = await prisma.pNJMovement.update({
        where: { id: movementId },
        data: {
          date: date ? new Date(date) : movement.date,
          description: sanitizeString(description) || description.trim(),
          notes: sanitizeString(notes) || null,
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

      res.json(updatedMovement);
    } catch (error) {
      appLogger.error('Erro ao atualizar andamento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar andamento' });
    }
  }

  /**
   * Remover andamento do PNJ
   */
  async removeMovement(req: AuthRequest, res: Response) {
    try {
      const { id, movementId } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se PNJ existe e pertence à empresa
      const pnj = await prisma.pNJ.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!pnj) {
        return res.status(404).json({ error: 'PNJ não encontrado' });
      }

      // Verificar se o andamento existe
      const movement = await prisma.pNJMovement.findFirst({
        where: {
          id: movementId,
          pnjId: id,
        },
      });

      if (!movement) {
        return res.status(404).json({ error: 'Andamento não encontrado' });
      }

      await prisma.pNJMovement.delete({
        where: { id: movementId },
      });

      res.json({ message: 'Andamento removido com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover andamento do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao remover andamento' });
    }
  }
}

export default new PNJController();
