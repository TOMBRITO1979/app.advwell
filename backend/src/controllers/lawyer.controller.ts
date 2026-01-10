import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

class LawyerController {
  // Listar advogados com paginação e filtros
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { search, page = '1', limit = '50', lawyerType, team, affiliation } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = { companyId, active: true };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { cpf: { contains: search as string, mode: 'insensitive' } },
          { oab: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (lawyerType) {
        where.lawyerType = lawyerType;
      }

      if (affiliation) {
        where.affiliation = affiliation;
      }

      if (team) {
        where.team = { contains: team as string, mode: 'insensitive' };
      }

      const [lawyers, total] = await Promise.all([
        prisma.lawyer.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        prisma.lawyer.count({ where }),
      ]);

      res.json({ data: lawyers, total, page: parseInt(page as string), limit: take });
    } catch (error) {
      logger.error('Erro ao listar advogados', { error });
      res.status(500).json({ error: 'Erro ao listar advogados' });
    }
  }

  // Buscar advogado por ID
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const lawyer = await prisma.lawyer.findFirst({
        where: { id, companyId },
      });

      if (!lawyer) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      res.json(lawyer);
    } catch (error) {
      logger.error('Erro ao buscar advogado', { error });
      res.status(500).json({ error: 'Erro ao buscar advogado' });
    }
  }

  // Criar advogado
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const {
        name,
        cpf,
        oab,
        oabState,
        lawyerType,
        affiliation,
        team,
        email,
        phone,
        phone2,
        instagram,
        facebook,
        customField1,
        customField2,
        address,
        neighborhood,
        city,
        state,
        zipCode,
        notes,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      const lawyer = await prisma.lawyer.create({
        data: {
          companyId,
          name,
          cpf,
          oab,
          oabState,
          lawyerType: lawyerType || 'ASSOCIADO',
          affiliation: affiliation || 'ESCRITORIO',
          team,
          email,
          phone,
          phone2,
          instagram,
          facebook,
          customField1,
          customField2,
          address,
          neighborhood,
          city,
          state,
          zipCode,
          notes,
        },
      });

      logger.info('Advogado criado', { lawyerId: lawyer.id, companyId });
      res.status(201).json(lawyer);
    } catch (error) {
      logger.error('Erro ao criar advogado', { error });
      res.status(500).json({ error: 'Erro ao criar advogado' });
    }
  }

  // Atualizar advogado
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        name,
        cpf,
        oab,
        oabState,
        lawyerType,
        affiliation,
        team,
        email,
        phone,
        phone2,
        instagram,
        facebook,
        customField1,
        customField2,
        address,
        neighborhood,
        city,
        state,
        zipCode,
        notes,
      } = req.body;

      // Verificar se o advogado existe e pertence à empresa
      const existingLawyer = await prisma.lawyer.findFirst({
        where: { id, companyId },
      });

      if (!existingLawyer) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      const lawyer = await prisma.lawyer.update({
        where: { id },
        data: {
          name,
          cpf,
          oab,
          oabState,
          lawyerType,
          affiliation,
          team,
          email,
          phone,
          phone2,
          instagram,
          facebook,
          customField1,
          customField2,
          address,
          neighborhood,
          city,
          state,
          zipCode,
          notes,
        },
      });

      logger.info('Advogado atualizado', { lawyerId: id, companyId });
      res.json(lawyer);
    } catch (error) {
      logger.error('Erro ao atualizar advogado', { error });
      res.status(500).json({ error: 'Erro ao atualizar advogado' });
    }
  }

  // Excluir advogado (soft delete)
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      // Verificar se o advogado existe e pertence à empresa
      const existingLawyer = await prisma.lawyer.findFirst({
        where: { id, companyId },
      });

      if (!existingLawyer) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      await prisma.lawyer.update({
        where: { id },
        data: { active: false },
      });

      logger.info('Advogado excluído', { lawyerId: id, companyId });
      res.json({ message: 'Advogado excluído com sucesso' });
    } catch (error) {
      logger.error('Erro ao excluir advogado', { error });
      res.status(500).json({ error: 'Erro ao excluir advogado' });
    }
  }

  // Busca rápida para autocomplete
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q } = req.query;

      if (!q) {
        return res.json([]);
      }

      const lawyers = await prisma.lawyer.findMany({
        where: {
          companyId,
          active: true,
          OR: [
            { name: { contains: q as string, mode: 'insensitive' } },
            { oab: { contains: q as string, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          oab: true,
          oabState: true,
          lawyerType: true,
          affiliation: true,
          team: true,
        },
        take: 10,
        orderBy: { name: 'asc' },
      });

      res.json(lawyers);
    } catch (error) {
      logger.error('Erro na busca de advogados', { error });
      res.status(500).json({ error: 'Erro na busca de advogados' });
    }
  }
}

export default new LawyerController();
