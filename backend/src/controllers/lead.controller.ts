import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';

// Helper para construir filtros de busca (fora da classe para evitar problemas com this)
function buildLeadWhereClause(companyId: string, query: any) {
  const { search = '', status = '', tagId = '', dateFrom = '', dateTo = '' } = query;

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
    ...(tagId && {
      leadTags: {
        some: {
          tagId: String(tagId),
        },
      },
    }),
  };

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom && { gte: new Date(String(dateFrom)) }),
      ...(dateTo && { lte: new Date(String(dateTo) + 'T23:59:59.999Z') }),
    };
  }

  return where;
}

export class LeadController {
  /**
   * Criar novo lead
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, contactReason, status, source, notes, tagIds } = req.body;
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

      // Usar transação para criar lead e tags
      const lead = await prisma.$transaction(async (tx) => {
        const newLead = await tx.lead.create({
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

        // Criar relações com tags se fornecidas
        if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
          await tx.leadTag.createMany({
            data: tagIds.map((tagId: string) => ({
              leadId: newLead.id,
              tagId,
              companyId,
            })),
          });
        }

        // Retornar lead com tags incluídas
        return tx.lead.findUnique({
          where: { id: newLead.id },
          include: {
            leadTags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        });
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
      const { page = 1, limit = 10, search = '', status = '', tagId = '', dateFrom = '', dateTo = '' } = req.query;

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
            // Buscar por nome de tag
            {
              leadTags: {
                some: {
                  tag: {
                    name: { contains: String(search), mode: 'insensitive' as const },
                  },
                },
              },
            },
          ],
        }),
        ...(status && status !== 'ALL' && { status: String(status) }),
        // Filtro por tag
        ...(tagId && {
          leadTags: {
            some: {
              tagId: String(tagId),
            },
          },
        }),
        // Filtro por data
        ...(dateFrom || dateTo) && {
          createdAt: {
            ...(dateFrom && { gte: new Date(String(dateFrom)) }),
            ...(dateTo && { lte: new Date(String(dateTo) + 'T23:59:59.999Z') }),
          },
        },
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
            leadTags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
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
          leadTags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
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
      const { name, phone, email, contactReason, status, source, notes, tagIds } = req.body;

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

      // Usar transação para atualizar lead e tags
      const updatedLead = await prisma.$transaction(async (tx) => {
        const updated = await tx.lead.update({
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

        // Atualizar tags se fornecidas (substituir todas as tags existentes)
        if (tagIds !== undefined && Array.isArray(tagIds)) {
          // Remover todas as tags existentes do lead
          await tx.leadTag.deleteMany({
            where: { leadId: id, companyId },
          });

          // Criar novas relações com tags
          if (tagIds.length > 0 && companyId) {
            await tx.leadTag.createMany({
              data: tagIds.map((tagId: string) => ({
                leadId: id,
                tagId,
                companyId: companyId as string,
              })),
            });
          }
        }

        // Retornar lead com tags incluídas
        return tx.lead.findUnique({
          where: { id },
          include: {
            leadTags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        });
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

      // Verificar se CPF foi informado e se já existe
      const cleanCpf = cpf?.trim() || null;
      if (cleanCpf) {
        const existingClientByCpf = await prisma.client.findFirst({
          where: {
            companyId,
            cpf: cleanCpf,
            active: true,
          },
        });

        if (existingClientByCpf) {
          return res.status(400).json({
            error: 'Já existe um cliente com este CPF/CNPJ',
            existingClient: {
              id: existingClientByCpf.id,
              name: existingClientByCpf.name,
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
            cpf: cleanCpf, // Usar null se vazio para evitar conflito de unique constraint
            rg: rg?.trim() || null,
            address: sanitizeString(address) || null,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zipCode: zipCode?.trim() || null,
            profession: sanitizeString(profession) || null,
            maritalStatus: sanitizeString(maritalStatus) || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            notes: sanitizeString(
              [lead.contactReason, lead.notes, additionalNotes]
                .filter(Boolean)
                .join('\n\n--- Lead convertido ---\n\n')
            ) || null,
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

  /**
   * Exportar leads para CSV
   */
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where = buildLeadWhereClause(companyId, req.query);

      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          leadTags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
          },
        },
      });

      const statusLabels: Record<string, string> = {
        NOVO: 'Novo',
        CONTATADO: 'Contatado',
        QUALIFICADO: 'Qualificado',
        CONVERTIDO: 'Convertido',
        PERDIDO: 'Perdido',
      };

      const sourceLabels: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        TELEFONE: 'Telefone',
        SITE: 'Site',
        INDICACAO: 'Indicação',
        REDES_SOCIAIS: 'Redes Sociais',
        OUTROS: 'Outros',
      };

      // Gerar CSV
      const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Origem', 'Tags', 'Motivo do Contato', 'Observações', 'Data de Criação'];
      const rows = leads.map((lead) => [
        lead.name,
        lead.phone || '',
        lead.email || '',
        statusLabels[lead.status] || lead.status,
        sourceLabels[lead.source] || lead.source,
        lead.leadTags?.map((lt) => lt.tag.name).join(', ') || '',
        (lead.contactReason || '').replace(/[\n\r]/g, ' '),
        (lead.notes || '').replace(/[\n\r]/g, ' '),
        lead.createdAt.toLocaleDateString('pt-BR'),
      ]);

      // Escape CSV values
      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map(escapeCSV).join(',')),
      ].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const csvWithBOM = '\uFEFF' + csv;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=leads_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvWithBOM);
    } catch (error) {
      appLogger.error('Erro ao exportar leads para CSV:', error as Error);
      res.status(500).json({ error: 'Erro ao exportar leads' });
    }
  }

  /**
   * Exportar leads para PDF
   */
  async exportPDF(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where = buildLeadWhereClause(companyId, req.query);

      const [leads, company] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            leadTags: {
              include: {
                tag: {
                  select: { name: true },
                },
              },
            },
          },
        }),
        prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true },
        }),
      ]);

      const statusLabels: Record<string, string> = {
        NOVO: 'Novo',
        CONTATADO: 'Contatado',
        QUALIFICADO: 'Qualificado',
        CONVERTIDO: 'Convertido',
        PERDIDO: 'Perdido',
      };

      const sourceLabels: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        TELEFONE: 'Telefone',
        SITE: 'Site',
        INDICACAO: 'Indicação',
        REDES_SOCIAIS: 'Redes Sociais',
        OUTROS: 'Outros',
      };

      // Gerar PDF usando PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=leads_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Header
      doc.fontSize(18).fillColor('#333333').text('Relatório de Leads', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(
        `${company?.name || 'Empresa'} - Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333333').text(`Total de leads: ${leads.length}`, { align: 'center' });
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const colWidths = [120, 90, 140, 70, 80, 100, 70];
      const headers = ['Nome', 'Telefone', 'Email', 'Status', 'Origem', 'Tags', 'Data'];

      // Draw header background
      doc.fillColor('#f5f5f5').rect(40, tableTop, 760, 20).fill();

      // Draw header text
      doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
      let xPos = 45;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      // Draw table rows
      doc.font('Helvetica').fontSize(8);
      let yPos = tableTop + 25;

      leads.forEach((lead, index) => {
        // Check if we need a new page
        if (yPos > 520) {
          doc.addPage({ layout: 'landscape' });
          yPos = 50;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.fillColor('#fafafa').rect(40, yPos - 3, 760, 18).fill();
        }

        doc.fillColor('#333333');
        xPos = 45;

        // Nome
        doc.text(lead.name.substring(0, 20), xPos, yPos, { width: colWidths[0] });
        xPos += colWidths[0];

        // Telefone
        doc.text(lead.phone || '-', xPos, yPos, { width: colWidths[1] });
        xPos += colWidths[1];

        // Email
        doc.text((lead.email || '-').substring(0, 25), xPos, yPos, { width: colWidths[2] });
        xPos += colWidths[2];

        // Status
        doc.text(statusLabels[lead.status] || lead.status, xPos, yPos, { width: colWidths[3] });
        xPos += colWidths[3];

        // Origem
        doc.text(sourceLabels[lead.source] || lead.source, xPos, yPos, { width: colWidths[4] });
        xPos += colWidths[4];

        // Tags
        const tagsText = lead.leadTags?.map((lt) => lt.tag.name).join(', ') || '-';
        doc.text(tagsText.substring(0, 18), xPos, yPos, { width: colWidths[5] });
        xPos += colWidths[5];

        // Data
        doc.text(lead.createdAt.toLocaleDateString('pt-BR'), xPos, yPos, { width: colWidths[6] });

        yPos += 18;
      });

      // Footer
      doc.fontSize(8).fillColor('#999999').text(
        'Relatório gerado pelo sistema AdvWell',
        40,
        doc.page.height - 30,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      appLogger.error('Erro ao exportar leads para PDF:', error as Error);
      res.status(500).json({ error: 'Erro ao exportar leads para PDF' });
    }
  }
}

export default new LeadController();
