import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { auditLogService } from '../services/audit-log.service';
import { appLogger } from '../utils/logger';

export class ClientController {
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        personType, name, cpf, rg, email, phone, address, city, state, zipCode,
        profession, maritalStatus, birthDate, representativeName, representativeCpf, notes, tag
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

      const client = await prisma.client.create({
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

      // Registra log de auditoria
      await auditLogService.logClientCreate(client, req);

      res.status(201).json(client);
    } catch (error) {
      appLogger.error('Erro ao criar cliente', error as Error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
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

      const where = {
        companyId,
        active: true,
        ...(search && {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { cpf: { contains: String(search) } },
            { email: { contains: String(search), mode: 'insensitive' as const } },
            { tag: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }),
      };

      const clients = await prisma.client.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
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
        profession, maritalStatus, birthDate, representativeName, representativeCpf, notes, tag
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

      const updatedClient = await prisma.client.update({
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

      // Registra log de auditoria
      await auditLogService.logClientUpdate(oldClient, updatedClient, req);

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

      // Buscar todos os clientes ativos
      const clients = await prisma.client.findMany({
        where: {
          companyId,
          active: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Cabeçalho do CSV
      const csvHeader = 'Tipo,Nome,CPF/CNPJ,RG,Email,Telefone,Endereço,Cidade,Estado,CEP,Profissão,Estado Civil,Data de Nascimento,Representante Legal,CPF Representante,Observações,Data de Cadastro\n';

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
        const birthDate = client.birthDate ? `"${new Date(client.birthDate).toLocaleDateString('pt-BR')}"` : '""';
        const representativeName = `"${client.representativeName || ''}"`;
        const representativeCpf = `"${client.representativeCpf || ''}"`;
        const notes = `"${(client.notes || '').replace(/"/g, '""')}"`;
        const createdAt = `"${new Date(client.createdAt).toLocaleDateString('pt-BR')}"`;

        return `${personType},${name},${cpf},${rg},${email},${phone},${address},${city},${state},${zipCode},${profession},${maritalStatus},${birthDate},${representativeName},${representativeCpf},${notes},${createdAt}`;
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
