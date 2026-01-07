import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { auditLogService } from '../services/audit-log.service';
import { appLogger } from '../utils/logger';

// Helper para construir filtros de busca (fora da classe para evitar problemas com this)
function buildClientWhereClause(companyId: string, query: any) {
  const { search = '', tagId = '', dateFrom = '', dateTo = '' } = query;

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
    ...(tagId && {
      clientTags: {
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

export class ClientController {
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        personType, name, cpf, rg, email, phone, address, city, state, zipCode,
        profession, maritalStatus, birthDate, representativeName, representativeCpf, notes, tag, tagIds
      } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se CPF já existe na empresa (se foi informado)
      if (cpf && cpf.trim()) {
        const existingClient = await prisma.client.findFirst({
          where: {
            companyId,
            cpf: cpf.trim(),
          },
        });

        if (existingClient) {
          return res.status(400).json({
            error: `Já existe um cliente com este CPF/CNPJ: ${existingClient.name}`
          });
        }
      }

      // Converter strings vazias para null para evitar conflito de unique constraint
      const cleanCpf = cpf?.trim() || null;
      const cleanRg = rg?.trim() || null;
      const cleanEmail = email?.trim()?.toLowerCase() || null;
      const cleanPhone = phone?.trim() || null;
      const cleanRepresentativeCpf = representativeCpf?.trim() || null;

      // Usar transação para criar cliente e tags
      const client = await prisma.$transaction(async (tx) => {
        const newClient = await tx.client.create({
          data: {
            companyId,
            personType: personType || 'FISICA',
            name,
            cpf: cleanCpf,
            rg: cleanRg,
            email: cleanEmail,
            phone: cleanPhone,
            address: sanitizeString(address) || null,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zipCode: zipCode?.trim() || null,
            profession: sanitizeString(profession) || null,
            maritalStatus: sanitizeString(maritalStatus) || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            representativeName: sanitizeString(representativeName) || null,
            representativeCpf: cleanRepresentativeCpf,
            notes: sanitizeString(notes) || null,
            tag: sanitizeString(tag) || null,
          },
        });

        // Criar relações com tags se fornecidas
        if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
          await tx.clientTag.createMany({
            data: tagIds.map((tagId: string) => ({
              clientId: newClient.id,
              tagId,
              companyId,
            })),
          });
        }

        // Retornar cliente com tags incluídas
        return tx.client.findUnique({
          where: { id: newClient.id },
          include: {
            clientTags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        });
      });

      // Registra log de auditoria
      await auditLogService.logClientCreate(client!, req);

      res.status(201).json(client);
    } catch (error) {
      appLogger.error('Erro ao criar cliente', error as Error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 10, search = '', tagId = '', dateFrom = '', dateTo = '' } = req.query;

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
            { tag: { contains: String(search), mode: 'insensitive' as const } },
            // Buscar por nome de tag
            {
              clientTags: {
                some: {
                  tag: {
                    name: { contains: String(search), mode: 'insensitive' as const },
                  },
                },
              },
            },
          ],
        }),
        // Filtro por tag
        ...(tagId && {
          clientTags: {
            some: {
              tagId: String(tagId),
            },
          },
        }),
      };

      // Filtro por data
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom && { gte: new Date(String(dateFrom)) }),
          ...(dateTo && { lte: new Date(String(dateTo) + 'T23:59:59.999Z') }),
        };
      }

      const clients = await prisma.client.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          clientTags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      });

      res.json({ data: clients });
    } catch (error) {
      appLogger.error('Erro ao listar clientes', error as Error);
      res.status(500).json({ error: 'Erro ao listar clientes' });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          cases: {
            orderBy: { createdAt: 'desc' },
          },
          clientTags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(client);
    } catch (error) {
      appLogger.error('Erro ao buscar cliente', error as Error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        personType, name, cpf, rg, email, phone, address, city, state, zipCode,
        profession, maritalStatus, birthDate, representativeName, representativeCpf, notes, tag, tagIds
      } = req.body;

      const oldClient = await prisma.client.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!oldClient) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Converter strings vazias para null para evitar conflito de unique constraint
      const cleanCpf = cpf?.trim() || null;
      const cleanRg = rg?.trim() || null;
      const cleanEmail = email?.trim()?.toLowerCase() || null;
      const cleanPhone = phone?.trim() || null;
      const cleanRepresentativeCpf = representativeCpf?.trim() || null;

      // Verificar se CPF já existe em outro cliente da empresa
      if (cleanCpf && cleanCpf !== oldClient.cpf) {
        const existingClient = await prisma.client.findFirst({
          where: {
            companyId: companyId!,
            cpf: cleanCpf,
            id: { not: id }, // Excluir o próprio cliente
            active: true,
          },
        });

        if (existingClient) {
          return res.status(400).json({
            error: `Já existe um cliente com este CPF/CNPJ: ${existingClient.name}`
          });
        }
      }

      // Usar transação para atualizar cliente e tags
      const updatedClient = await prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({
          where: { id },
          data: {
            personType: personType || 'FISICA',
            name,
            cpf: cleanCpf,
            rg: cleanRg,
            email: cleanEmail,
            phone: cleanPhone,
            address: sanitizeString(address) || null,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zipCode: zipCode?.trim() || null,
            profession: sanitizeString(profession) || null,
            maritalStatus: sanitizeString(maritalStatus) || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            representativeName: sanitizeString(representativeName) || null,
            representativeCpf: cleanRepresentativeCpf,
            notes: sanitizeString(notes) || null,
            tag: sanitizeString(tag) || null,
          },
        });

        // Atualizar tags se fornecidas (substituir todas as tags existentes)
        if (tagIds !== undefined && Array.isArray(tagIds)) {
          // Remover todas as tags existentes do cliente
          await tx.clientTag.deleteMany({
            where: { clientId: id, companyId },
          });

          // Criar novas relações com tags
          if (tagIds.length > 0 && companyId) {
            await tx.clientTag.createMany({
              data: tagIds.map((tagId: string) => ({
                clientId: id,
                tagId,
                companyId: companyId as string,
              })),
            });
          }
        }

        // Retornar cliente com tags incluídas
        return tx.client.findUnique({
          where: { id },
          include: {
            clientTags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        });
      });

      // Registra log de auditoria
      await auditLogService.logClientUpdate(oldClient, updatedClient!, req);

      res.json(updatedClient);
    } catch (error) {
      appLogger.error('Erro ao atualizar cliente', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      await prisma.client.update({
        where: { id },
        data: { active: false },
      });

      // Registra log de auditoria
      await auditLogService.logClientDelete(client, req);

      res.json({ message: 'Cliente desativado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar cliente', error as Error);
      res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }

  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where = buildClientWhereClause(companyId, req.query);

      // Buscar clientes com filtros
      const clients = await prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          clientTags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Cabeçalho do CSV
      const csvHeader = 'Tipo,Nome,CPF/CNPJ,RG,Email,Telefone,Endereço,Cidade,Estado,CEP,Profissão,Estado Civil,Data de Nascimento,Tags,Representante Legal,CPF Representante,Observações,Data de Cadastro\n';

      // Linhas do CSV
      const csvRows = clients.map(client => {
        const personType = `"${client.personType || 'FISICA'}"`;
        const name = `"${client.name || ''}"`;
        const cpf = `"${client.cpf || ''}"`;
        const rg = `"${client.rg || ''}"`;
        const email = `"${client.email || ''}"`;
        const phone = `"${client.phone || ''}"`;
        const address = `"${client.address || ''}"`;
        const city = `"${client.city || ''}"`;
        const state = `"${client.state || ''}"`;
        const zipCode = `"${client.zipCode || ''}"`;
        const profession = `"${client.profession || ''}"`;
        const maritalStatus = `"${client.maritalStatus || ''}"`;
        const birthDate = client.birthDate ? `"${new Date(client.birthDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""';
        const tags = `"${client.clientTags?.map((ct) => ct.tag.name).join(', ') || ''}"`;
        const representativeName = `"${client.representativeName || ''}"`;
        const representativeCpf = `"${client.representativeCpf || ''}"`;
        const notes = `"${(client.notes || '').replace(/"/g, '""')}"`;
        const createdAt = `"${new Date(client.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`;

        return `${personType},${name},${cpf},${rg},${email},${phone},${address},${city},${state},${zipCode},${profession},${maritalStatus},${birthDate},${tags},${representativeName},${representativeCpf},${notes},${createdAt}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      // Configurar headers para download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.csv`);

      // Adicionar BOM para Excel reconhecer UTF-8
      res.send('\ufeff' + csv);
    } catch (error) {
      appLogger.error('Erro ao exportar clientes', error as Error);
      res.status(500).json({ error: 'Erro ao exportar clientes' });
    }
  }

  async exportPDF(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where = buildClientWhereClause(companyId, req.query);

      const [clients, company] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            clientTags: {
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

      // Gerar PDF usando PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Header
      doc.fontSize(18).fillColor('#333333').text('Relatório de Clientes', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(
        `${company?.name || 'Empresa'} - Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333333').text(`Total de clientes: ${clients.length}`, { align: 'center' });
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const colWidths = [140, 100, 120, 100, 100, 100];
      const headers = ['Nome', 'CPF/CNPJ', 'Email', 'Telefone', 'Tags', 'Data'];

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

      clients.forEach((client, index) => {
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
        doc.text(client.name.substring(0, 25), xPos, yPos, { width: colWidths[0] });
        xPos += colWidths[0];

        // CPF/CNPJ
        doc.text(client.cpf || '-', xPos, yPos, { width: colWidths[1] });
        xPos += colWidths[1];

        // Email
        doc.text((client.email || '-').substring(0, 22), xPos, yPos, { width: colWidths[2] });
        xPos += colWidths[2];

        // Telefone
        doc.text(client.phone || '-', xPos, yPos, { width: colWidths[3] });
        xPos += colWidths[3];

        // Tags
        const tagsText = client.clientTags?.map((ct) => ct.tag.name).join(', ') || '-';
        doc.text(tagsText.substring(0, 18), xPos, yPos, { width: colWidths[4] });
        xPos += colWidths[4];

        // Data
        doc.text(client.createdAt.toLocaleDateString('pt-BR'), xPos, yPos, { width: colWidths[5] });

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
      appLogger.error('Erro ao exportar clientes para PDF:', error as Error);
      res.status(500).json({ error: 'Erro ao exportar clientes para PDF' });
    }
  }

  async importCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Remover BOM se existir
      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      // Parse do CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });

      const results = {
        total: records.length,
        success: 0,
        errors: [] as { line: number; name: string; error: string }[],
      };

      // Processar cada linha
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        const lineNumber = i + 2; // +2 porque linha 1 é header e array começa em 0

        try {
          // Validar campo obrigatório
          if (!record.Nome || record.Nome.trim() === '') {
            results.errors.push({
              line: lineNumber,
              name: record.Nome || '(vazio)',
              error: 'Nome é obrigatório',
            });
            continue;
          }

          // Converter data de nascimento se existir
          let birthDate = null;
          if (record['Data de Nascimento']) {
            // Aceita formatos: DD/MM/YYYY ou YYYY-MM-DD
            const dateStr = record['Data de Nascimento'].trim();
            if (dateStr) {
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                birthDate = new Date(`${year}-${month}-${day}`);
              } else {
                birthDate = new Date(dateStr);
              }

              if (isNaN(birthDate.getTime())) {
                birthDate = null;
              }
            }
          }

          // Criar cliente
          await prisma.client.create({
            data: {
              companyId,
              personType: record['Tipo']?.trim() === 'JURIDICA' ? 'JURIDICA' : 'FISICA',
              name: record.Nome.trim(),
              cpf: record['CPF/CNPJ']?.trim() || record.CPF?.trim() || null,
              rg: record.RG?.trim() || null,
              email: record.Email?.trim() || null,
              phone: record.Telefone?.trim() || null,
              address: record['Endereço']?.trim() || null,
              city: record.Cidade?.trim() || null,
              state: record.Estado?.trim() || null,
              zipCode: record.CEP?.trim() || null,
              profession: record['Profissão']?.trim() || null,
              maritalStatus: record['Estado Civil']?.trim() || null,
              birthDate,
              representativeName: record['Representante Legal']?.trim() || null,
              representativeCpf: record['CPF Representante']?.trim() || null,
              notes: record['Observações']?.trim() || null,
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            line: lineNumber,
            name: record.Nome || '(vazio)',
            error: 'Erro ao processar linha', // Safe: no error.message exposure
          });
        }
      }

      res.json({
        message: 'Importação concluída',
        results,
      });
    } catch (error) {
      appLogger.error('Erro ao importar clientes', error as Error);
      res.status(500).json({ error: 'Erro ao importar clientes' });
    }
  }

  // Busca rápida para autocomplete (apenas campos essenciais)
  async search(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { q = '' } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const clients = await prisma.client.findMany({
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
        take: 10, // Limitar a 10 resultados
        select: {
          id: true,
          name: true,
          cpf: true,
        },
        orderBy: { name: 'asc' },
      });

      res.json(clients);
    } catch (error) {
      appLogger.error('Erro ao buscar clientes', error as Error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }
}

export default new ClientController();
