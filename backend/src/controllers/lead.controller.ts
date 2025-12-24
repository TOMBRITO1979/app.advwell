import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';

export class LeadController {
  /**
   * Criar novo lead
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, contactReason, status, source, notes } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validação: nome e telefone são obrigatórios
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: 'Telefone é obrigatório' });
      }

      const lead = await prisma.lead.create({
        data: {
          companyId,
          name: sanitizeString(name) || name,
          phone: phone.trim(),
          email: email?.trim()?.toLowerCase() || null,
          contactReason: sanitizeString(contactReason) || null,
          status: status || 'NOVO',
          source: source || 'WHATSAPP',
          notes: sanitizeString(notes) || null,
        },
      });

      res.status(201).json(lead);
    } catch (error) {
      appLogger.error('Erro ao criar lead:', error as Error);
      res.status(500).json({ error: 'Erro ao criar lead' });
    }
  }

  /**
   * Listar leads com paginação e busca
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '', status = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        companyId,
        ...(search && {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { phone: { contains: String(search) } },
            { email: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }),
        ...(status && status !== 'ALL' && { status: String(status) }),
      };

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            convertedToClient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.lead.count({ where }),
      ]);

      res.json({
        data: leads,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar leads:', error as Error);
      res.status(500).json({ error: 'Erro ao listar leads' });
    }
  }

  /**
   * Buscar lead por ID
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const lead = await prisma.lead.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          convertedToClient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      res.json(lead);
    } catch (error) {
      appLogger.error('Erro ao buscar lead:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar lead' });
    }
  }

  /**
   * Atualizar lead
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { name, phone, email, contactReason, status, source, notes } = req.body;

      const lead = await prisma.lead.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      // Não permitir edição de lead convertido
      if (lead.status === 'CONVERTIDO') {
        return res.status(400).json({ error: 'Não é possível editar um lead já convertido' });
      }

      // Validação: nome e telefone são obrigatórios
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: 'Telefone é obrigatório' });
      }

      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          name: sanitizeString(name) || name,
          phone: phone.trim(),
          email: email?.trim()?.toLowerCase() || null,
          contactReason: sanitizeString(contactReason) || null,
          status: status || lead.status,
          source: source || lead.source,
          notes: sanitizeString(notes) || null,
        },
      });

      res.json(updatedLead);
    } catch (error) {
      appLogger.error('Erro ao atualizar lead:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar lead' });
    }
  }

  /**
   * Deletar lead
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const lead = await prisma.lead.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      await prisma.lead.delete({
        where: { id },
      });

      res.json({ message: 'Lead deletado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar lead:', error as Error);
      res.status(500).json({ error: 'Erro ao deletar lead' });
    }
  }

  /**
   * Verificar se telefone existe em clientes
   * Usado para verificar se contato do WhatsApp já é cliente
   */
  async checkPhone(req: AuthRequest, res: Response) {
    try {
      const { phone } = req.query;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório' });
      }

      // Limpar número de telefone (remover caracteres especiais)
      const cleanPhone = String(phone).replace(/\D/g, '');

      // Buscar cliente com este telefone
      const client = await prisma.client.findFirst({
        where: {
          companyId,
          active: true,
          phone: {
            contains: cleanPhone,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
        },
      });

      if (client) {
        return res.json({
          isClient: true,
          client,
        });
      }

      // Buscar se já existe lead com este telefone
      const existingLead = await prisma.lead.findFirst({
        where: {
          companyId,
          phone: {
            contains: cleanPhone,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
      });

      res.json({
        isClient: false,
        client: null,
        existingLead: existingLead || null,
      });
    } catch (error) {
      appLogger.error('Erro ao verificar telefone:', error as Error);
      res.status(500).json({ error: 'Erro ao verificar telefone' });
    }
  }

  /**
   * Converter lead para cliente
   */
  async convertToClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        personType,
        cpf,
        rg,
        address,
        city,
        state,
        zipCode,
        profession,
        maritalStatus,
        birthDate,
        notes: additionalNotes,
      } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar lead
      const lead = await prisma.lead.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      if (lead.status === 'CONVERTIDO') {
        return res.status(400).json({ error: 'Este lead já foi convertido para cliente' });
      }

      // Verificar se já existe cliente com mesmo email ou telefone
      if (lead.email || lead.phone) {
        const existingClient = await prisma.client.findFirst({
          where: {
            companyId,
            active: true,
            OR: [
              ...(lead.email ? [{ email: lead.email }] : []),
              ...(lead.phone ? [{ phone: { contains: lead.phone.replace(/\D/g, '') } }] : []),
            ],
          },
        });

        if (existingClient) {
          return res.status(400).json({
            error: 'Já existe um cliente com este email ou telefone',
            existingClient: {
              id: existingClient.id,
              name: existingClient.name,
            },
          });
        }
      }

      // Criar cliente e atualizar lead em uma transação
      const result = await prisma.$transaction(async (tx) => {
        // Criar cliente
        const client = await tx.client.create({
          data: {
            companyId,
            personType: personType || 'FISICA',
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            cpf,
            rg,
            address: sanitizeString(address),
            city,
            state,
            zipCode,
            profession: sanitizeString(profession),
            maritalStatus: sanitizeString(maritalStatus),
            birthDate: birthDate ? new Date(birthDate) : null,
            notes: sanitizeString(
              [lead.contactReason, lead.notes, additionalNotes]
                .filter(Boolean)
                .join('\n\n--- Lead convertido ---\n\n')
            ),
          },
        });

        // Atualizar lead
        const updatedLead = await tx.lead.update({
          where: { id },
          data: {
            status: 'CONVERTIDO',
            convertedToClientId: client.id,
            convertedAt: new Date(),
          },
        });

        return { client, lead: updatedLead };
      });

      res.json({
        message: 'Lead convertido para cliente com sucesso',
        client: result.client,
        lead: result.lead,
      });
    } catch (error) {
      appLogger.error('Erro ao converter lead para cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao converter lead para cliente' });
    }
  }

  /**
   * Estatísticas de leads
   */
  async stats(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const [total, novo, contatado, qualificado, convertido, perdido] = await Promise.all([
        prisma.lead.count({ where: { companyId } }),
        prisma.lead.count({ where: { companyId, status: 'NOVO' } }),
        prisma.lead.count({ where: { companyId, status: 'CONTATADO' } }),
        prisma.lead.count({ where: { companyId, status: 'QUALIFICADO' } }),
        prisma.lead.count({ where: { companyId, status: 'CONVERTIDO' } }),
        prisma.lead.count({ where: { companyId, status: 'PERDIDO' } }),
      ]);

      res.json({
        total,
        byStatus: {
          NOVO: novo,
          CONTATADO: contatado,
          QUALIFICADO: qualificado,
          CONVERTIDO: convertido,
          PERDIDO: perdido,
        },
        conversionRate: total > 0 ? ((convertido / total) * 100).toFixed(1) : '0',
      });
    } catch (error) {
      appLogger.error('Erro ao buscar estatísticas de leads:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export default new LeadController();
