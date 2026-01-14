import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';

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

  // Exportar advogados para CSV
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const lawyers = await prisma.lawyer.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      });

      // Cabeçalho CSV
      const headers = [
        'Nome', 'CPF', 'OAB', 'UF OAB', 'Tipo', 'Vínculo', 'Equipe',
        'Email', 'Telefone', 'Telefone 2', 'Instagram', 'Facebook',
        'Campo Personalizado 1', 'Campo Personalizado 2',
        'Endereço', 'Bairro', 'Cidade', 'Estado', 'CEP', 'Observações'
      ];

      // Mapeamento de tipos para exibição
      const lawyerTypeMap: Record<string, string> = {
        'SOCIO': 'Sócio',
        'ASSOCIADO': 'Associado',
        'CORRESPONDENTE': 'Correspondente',
        'ESTAGIARIO': 'Estagiário',
      };

      const affiliationMap: Record<string, string> = {
        'ESCRITORIO': 'Escritório',
        'EXTERNO': 'Externo',
      };

      // Gerar linhas CSV
      const rows = lawyers.map(lawyer => [
        lawyer.name || '',
        lawyer.cpf || '',
        lawyer.oab || '',
        lawyer.oabState || '',
        lawyerTypeMap[lawyer.lawyerType || ''] || lawyer.lawyerType || '',
        affiliationMap[lawyer.affiliation || ''] || lawyer.affiliation || '',
        lawyer.team || '',
        lawyer.email || '',
        lawyer.phone || '',
        lawyer.phone2 || '',
        lawyer.instagram || '',
        lawyer.facebook || '',
        lawyer.customField1 || '',
        lawyer.customField2 || '',
        lawyer.address || '',
        lawyer.neighborhood || '',
        lawyer.city || '',
        lawyer.state || '',
        lawyer.zipCode || '',
        lawyer.notes || '',
      ]);

      // Escape CSV fields
      const escapeCSV = (field: string) => {
        if (field.includes(';') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(field => escapeCSV(String(field))).join(';'))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=advogados.csv');
      res.send('\uFEFF' + csvContent); // BOM para Excel
    } catch (error) {
      logger.error('Erro ao exportar advogados CSV', { error });
      res.status(500).json({ error: 'Erro ao exportar advogados' });
    }
  }

  // Importar advogados via CSV (processamento em background)
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

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return res.status(400).json({ error: 'Arquivo CSV vazio ou sem dados' });
      }

      const totalRows = lines.length - 1; // Descontar header

      // Enfileirar job de importação
      const jobId = await enqueueCsvImport('import-lawyer', companyId, userId, csvContent, totalRows);

      res.status(202).json({
        message: 'Importação iniciada em background',
        jobId,
        totalRows,
        statusUrl: `/lawyers/import/status/${jobId}`,
      });
    } catch (error) {
      logger.error('Erro ao iniciar importação de advogados', { error });
      res.status(500).json({ error: 'Erro ao iniciar importação' });
    }
  }

  // Consultar status da importação
  async getImportStatusEndpoint(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({ error: 'jobId é obrigatório' });
      }

      const status = await getImportStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: 'Job não encontrado ou expirado' });
      }

      res.json(status);
    } catch (error) {
      logger.error('Erro ao consultar status de importação', { error });
      res.status(500).json({ error: 'Erro ao consultar status' });
    }
  }
}

export default new LawyerController();
