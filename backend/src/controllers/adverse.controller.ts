import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';

export class AdverseController {
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        personType, name, cpf, stateRegistration, rg, pis, ctps, ctpsSerie, motherName,
        email, phone, phone2, instagram, facebook, customField1, customField2,
        address, neighborhood, city, state, zipCode,
        profession, nationality, maritalStatus, birthDate, representativeName, representativeCpf, notes
      } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      const cleanCpf = cpf?.trim() || null;
      const cleanEmail = email?.trim()?.toLowerCase() || null;
      const cleanPhone = phone?.trim() || null;

      const adverse = await prisma.adverse.create({
        data: {
          companyId,
          personType: personType || 'FISICA',
          name: name.trim(),
          cpf: cleanCpf,
          stateRegistration: stateRegistration?.trim() || null,
          rg: rg?.trim() || null,
          pis: pis?.trim() || null,
          ctps: ctps?.trim() || null,
          ctpsSerie: ctpsSerie?.trim() || null,
          motherName: sanitizeString(motherName) || null,
          email: cleanEmail,
          phone: cleanPhone,
          phone2: phone2?.trim() || null,
          instagram: instagram?.trim() || null,
          facebook: facebook?.trim() || null,
          customField1: customField1?.trim() || null,
          customField2: customField2?.trim() || null,
          address: sanitizeString(address) || null,
          neighborhood: neighborhood?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zipCode: zipCode?.trim() || null,
          profession: sanitizeString(profession) || null,
          nationality: nationality?.trim() || null,
          maritalStatus: sanitizeString(maritalStatus) || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          representativeName: sanitizeString(representativeName) || null,
          representativeCpf: representativeCpf?.trim() || null,
          notes: sanitizeString(notes) || null,
        },
      });

      res.status(201).json(adverse);
    } catch (error) {
      appLogger.error('Erro ao criar adverso', error as Error);
      res.status(500).json({ error: 'Erro ao criar adverso' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        companyId,
        active: true,
        ...(search && {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { cpf: { contains: String(search) } },
            { email: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }),
      };

      const [adverses, total] = await Promise.all([
        prisma.adverse.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.adverse.count({ where }),
      ]);

      res.json({
        data: adverses,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar adversos', error as Error);
      res.status(500).json({ error: 'Erro ao listar adversos' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const adverse = await prisma.adverse.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!adverse) {
        return res.status(404).json({ error: 'Adverso não encontrado' });
      }

      res.json(adverse);
    } catch (error) {
      appLogger.error('Erro ao buscar adverso', error as Error);
      res.status(500).json({ error: 'Erro ao buscar adverso' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        personType, name, cpf, stateRegistration, rg, pis, ctps, ctpsSerie, motherName,
        email, phone, phone2, instagram, facebook, customField1, customField2,
        address, neighborhood, city, state, zipCode,
        profession, nationality, maritalStatus, birthDate, representativeName, representativeCpf, notes
      } = req.body;

      const existing = await prisma.adverse.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Adverso não encontrado' });
      }

      const cleanCpf = cpf?.trim() || null;
      const cleanEmail = email?.trim()?.toLowerCase() || null;
      const cleanPhone = phone?.trim() || null;

      const updated = await prisma.adverse.update({
        where: { id },
        data: {
          personType: personType || 'FISICA',
          name: name?.trim() || existing.name,
          cpf: cleanCpf,
          stateRegistration: stateRegistration?.trim() || null,
          rg: rg?.trim() || null,
          pis: pis?.trim() || null,
          ctps: ctps?.trim() || null,
          ctpsSerie: ctpsSerie?.trim() || null,
          motherName: sanitizeString(motherName) || null,
          email: cleanEmail,
          phone: cleanPhone,
          phone2: phone2?.trim() || null,
          instagram: instagram?.trim() || null,
          facebook: facebook?.trim() || null,
          customField1: customField1?.trim() || null,
          customField2: customField2?.trim() || null,
          address: sanitizeString(address) || null,
          neighborhood: neighborhood?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zipCode: zipCode?.trim() || null,
          profession: sanitizeString(profession) || null,
          nationality: nationality?.trim() || null,
          maritalStatus: sanitizeString(maritalStatus) || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          representativeName: sanitizeString(representativeName) || null,
          representativeCpf: representativeCpf?.trim() || null,
          notes: sanitizeString(notes) || null,
        },
      });

      res.json(updated);
    } catch (error) {
      appLogger.error('Erro ao atualizar adverso', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar adverso' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const adverse = await prisma.adverse.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!adverse) {
        return res.status(404).json({ error: 'Adverso não encontrado' });
      }

      await prisma.adverse.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'Adverso desativado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar adverso', error as Error);
      res.status(500).json({ error: 'Erro ao deletar adverso' });
    }
  }

  // Busca rápida para autocomplete
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const adverses = await prisma.adverse.findMany({
        where: {
          companyId,
          active: true,
          ...(q && {
            OR: [
              { name: { contains: String(q), mode: 'insensitive' as const } },
              { cpf: { contains: String(q) } },
            ],
          }),
        },
        take: 10,
        select: {
          id: true,
          name: true,
          cpf: true,
          personType: true,
        },
        orderBy: { name: 'asc' },
      });

      res.json(adverses);
    } catch (error) {
      appLogger.error('Erro ao buscar adversos', error as Error);
      res.status(500).json({ error: 'Erro ao buscar adversos' });
    }
  }

  // Exportar adversos para CSV
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const adverses = await prisma.adverse.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      });

      // Cabeçalho CSV - todos os campos do modelo (28 colunas)
      const headers = [
        'Tipo Pessoa', 'Nome', 'CPF/CNPJ', 'Inscrição Estadual', 'RG', 'PIS', 'CTPS', 'CTPS Série',
        'Nome da Mãe', 'Email', 'Telefone', 'Telefone 2', 'Instagram', 'Facebook',
        'Campo Personalizado 1', 'Campo Personalizado 2', 'Endereço', 'Bairro',
        'Cidade', 'Estado', 'CEP', 'Profissão', 'Nacionalidade', 'Estado Civil',
        'Data de Nascimento', 'Nome do Representante', 'CPF do Representante', 'Observações'
      ];

      // Gerar linhas CSV
      const rows = adverses.map(adverse => [
        adverse.personType || 'FISICA',
        adverse.name || '',
        adverse.cpf || '',
        adverse.stateRegistration || '',
        adverse.rg || '',
        adverse.pis || '',
        adverse.ctps || '',
        adverse.ctpsSerie || '',
        adverse.motherName || '',
        adverse.email || '',
        adverse.phone || '',
        adverse.phone2 || '',
        adverse.instagram || '',
        adverse.facebook || '',
        adverse.customField1 || '',
        adverse.customField2 || '',
        adverse.address || '',
        adverse.neighborhood || '',
        adverse.city || '',
        adverse.state || '',
        adverse.zipCode || '',
        adverse.profession || '',
        adverse.nationality || '',
        adverse.maritalStatus || '',
        adverse.birthDate ? new Date(adverse.birthDate).toLocaleDateString('pt-BR') : '',
        adverse.representativeName || '',
        adverse.representativeCpf || '',
        adverse.notes || '',
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
      res.setHeader('Content-Disposition', 'attachment; filename=adversos.csv');
      res.send('\uFEFF' + csvContent); // BOM para Excel
    } catch (error) {
      appLogger.error('Erro ao exportar adversos CSV', error as Error);
      res.status(500).json({ error: 'Erro ao exportar adversos' });
    }
  }

  // Importar adversos via CSV (processamento em background)
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
      const jobId = await enqueueCsvImport('import-adverse', companyId, userId, csvContent, totalRows);

      res.status(202).json({
        message: 'Importação iniciada em background',
        jobId,
        totalRows,
        statusUrl: `/adverse/import/status/${jobId}`,
      });
    } catch (error) {
      appLogger.error('Erro ao iniciar importação de adversos', error as Error);
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
      appLogger.error('Erro ao consultar status de importação', error as Error);
      res.status(500).json({ error: 'Erro ao consultar status' });
    }
  }
}

export default new AdverseController();
