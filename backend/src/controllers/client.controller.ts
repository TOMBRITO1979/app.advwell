import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { auditLogService } from '../services/audit-log.service';
import { appLogger } from '../utils/logger';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';
import { enqueueExport, getExportStatus, SYNC_EXPORT_LIMIT } from '../queues/csv-export.queue';

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
        personType, clientCondition, name, cpf, stateRegistration, rg, pis, ctps, ctpsSerie, motherName,
        email, phone, phone2, instagram, facebook, address, neighborhood, city, state, zipCode,
        profession, nationality, customField1, customField2, maritalStatus, birthDate,
        representativeName, representativeCpf, notes, tag, tagIds
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

      // Verificar se email já existe na empresa (se foi informado)
      if (email && email.trim()) {
        const existingClientWithEmail = await prisma.client.findFirst({
          where: {
            companyId,
            email: email.trim().toLowerCase(),
          },
        });

        if (existingClientWithEmail) {
          return res.status(400).json({
            error: `Já existe um cliente com este email: ${existingClientWithEmail.name}`
          });
        }
      }

      // Verificar se telefone já existe na empresa (se foi informado)
      if (phone && phone.trim()) {
        const existingClientWithPhone = await prisma.client.findFirst({
          where: {
            companyId,
            phone: phone.trim(),
          },
        });

        if (existingClientWithPhone) {
          return res.status(400).json({
            error: `Já existe um cliente com este telefone: ${existingClientWithPhone.name}`
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
            clientCondition: clientCondition || null,
            name,
            cpf: cleanCpf,
            stateRegistration: stateRegistration?.trim() || null,
            rg: cleanRg,
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

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
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
            _count: {
              select: { cases: true },
            },
          },
        }),
        prisma.client.count({ where }),
      ]);

      res.json({
        data: clients,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
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
        personType, clientCondition, name, cpf, stateRegistration, rg, pis, ctps, ctpsSerie, motherName,
        email, phone, phone2, instagram, facebook, address, neighborhood, city, state, zipCode,
        profession, nationality, customField1, customField2, maritalStatus, birthDate,
        representativeName, representativeCpf, notes, tag, tagIds
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

      // Verificar se email já existe em outro cliente da empresa
      if (cleanEmail && cleanEmail !== oldClient.email?.toLowerCase()) {
        const existingClientWithEmail = await prisma.client.findFirst({
          where: {
            companyId: companyId!,
            email: cleanEmail,
            id: { not: id }, // Excluir o próprio cliente
            active: true,
          },
        });

        if (existingClientWithEmail) {
          return res.status(400).json({
            error: `Já existe um cliente com este email: ${existingClientWithEmail.name}`
          });
        }
      }

      // Verificar se telefone já existe em outro cliente da empresa
      if (cleanPhone && cleanPhone !== oldClient.phone) {
        const existingClientWithPhone = await prisma.client.findFirst({
          where: {
            companyId: companyId!,
            phone: cleanPhone,
            id: { not: id }, // Excluir o próprio cliente
            active: true,
          },
        });

        if (existingClientWithPhone) {
          return res.status(400).json({
            error: `Já existe um cliente com este telefone: ${existingClientWithPhone.name}`
          });
        }
      }

      // Usar transação para atualizar cliente e tags
      const updatedClient = await prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({
          where: { id },
          data: {
            personType: personType || 'FISICA',
            clientCondition: clientCondition || null,
            name,
            cpf: cleanCpf,
            stateRegistration: stateRegistration?.trim() || null,
            rg: cleanRg,
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
      const userId = req.user!.userId;
      const userEmail = req.user!.email;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where = buildClientWhereClause(companyId, req.query);

      // Primeiro, contar quantos registros serão exportados
      const totalRecords = await prisma.client.count({ where });

      // Se exceder o limite, enfileirar e enviar por email
      if (totalRecords >= SYNC_EXPORT_LIMIT) {
        const jobId = await enqueueExport(
          'clients',
          companyId,
          userId,
          userEmail,
          req.query as Record<string, any>,
          totalRecords
        );

        return res.json({
          queued: true,
          jobId,
          message: `Exportação com ${totalRecords.toLocaleString('pt-BR')} registros foi enfileirada. Você receberá o arquivo por email em alguns minutos.`,
          totalRecords,
        });
      }

      // Export síncrono para datasets menores
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
      const csvHeader = 'Tipo,Condição,Nome,CPF/CNPJ,RG,PIS,CTPS,CTPS Série,Nome da Mãe,Email,Telefone 1,Telefone 2,Instagram,Facebook,Endereço,Cidade,Estado,CEP,Profissão,Estado Civil,Data de Nascimento,Tags,Representante Legal,CPF Representante,Observações,Data de Cadastro\n';

      // Linhas do CSV
      const csvRows = clients.map(client => {
        const personType = `"${client.personType || 'FISICA'}"`;
        const clientCondition = `"${client.clientCondition || ''}"`;
        const name = `"${client.name || ''}"`;
        const cpf = `"${client.cpf || ''}"`;
        const rg = `"${client.rg || ''}"`;
        const pis = `"${client.pis || ''}"`;
        const ctps = `"${client.ctps || ''}"`;
        const ctpsSerie = `"${client.ctpsSerie || ''}"`;
        const motherName = `"${client.motherName || ''}"`;
        const email = `"${client.email || ''}"`;
        const phone = `"${client.phone || ''}"`;
        const phone2 = `"${client.phone2 || ''}"`;
        const instagram = `"${client.instagram || ''}"`;
        const facebook = `"${client.facebook || ''}"`;
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

        return `${personType},${clientCondition},${name},${cpf},${rg},${pis},${ctps},${ctpsSerie},${motherName},${email},${phone},${phone2},${instagram},${facebook},${address},${city},${state},${zipCode},${profession},${maritalStatus},${birthDate},${tags},${representativeName},${representativeCpf},${notes},${createdAt}`;
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

  // Verificar status de exportação
  async getExportStatus(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const status = await getExportStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: 'Exportação não encontrada' });
      }

      res.json(status);
    } catch (error) {
      appLogger.error('Erro ao buscar status de exportação', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status' });
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
      const userId = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Remover BOM se existir
      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      // Detectar delimitador (vírgula ou ponto e vírgula)
      const firstLine = csvContent.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';

      // Parse do CSV para validar e contar linhas
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter,
      });

      // PROTEÇÃO: Limitar quantidade de linhas para evitar sobrecarga
      const MAX_CSV_ROWS = 500;
      if (records.length > MAX_CSV_ROWS) {
        return res.status(400).json({
          error: 'Arquivo muito grande',
          message: `O arquivo contém ${records.length} registros. O máximo permitido é ${MAX_CSV_ROWS} registros por importação. Divida seu arquivo em partes menores.`,
          maxRows: MAX_CSV_ROWS,
          currentRows: records.length,
        });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'Arquivo CSV vazio' });
      }

      // Enfileirar job para processamento em background
      const jobId = await enqueueCsvImport('import-clients', companyId, userId, csvContent, records.length);

      res.status(202).json({
        message: 'Importação iniciada. O processamento ocorre em segundo plano.',
        jobId,
        totalRows: records.length,
        statusUrl: `/api/clients/import/status/${jobId}`,
      });
    } catch (error) {
      appLogger.error('Erro ao iniciar importação de clientes', error as Error);
      res.status(500).json({ error: 'Erro ao iniciar importação de clientes' });
    }
  }

  async getImportStatus(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;

      const status = await getImportStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: 'Job não encontrado ou expirado' });
      }

      res.json(status);
    } catch (error) {
      appLogger.error('Erro ao buscar status de importação', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status de importação' });
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
