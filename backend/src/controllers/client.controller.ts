import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';

export class ClientController {
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        name, cpf, rg, email, phone, address, city, state, zipCode,
        profession, maritalStatus, birthDate, notes, tag
      } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const client = await prisma.client.create({
        data: {
          companyId,
          name,
          cpf,
          rg,
          email,
          phone,
          address: sanitizeString(address),
          city,
          state,
          zipCode,
          profession: sanitizeString(profession),
          maritalStatus: sanitizeString(maritalStatus),
          birthDate: birthDate ? new Date(birthDate) : null,
          notes: sanitizeString(notes),
          tag: sanitizeString(tag),
        },
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
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
      console.error('Erro ao listar clientes:', error);
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
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        name, cpf, rg, email, phone, address, city, state, zipCode,
        profession, maritalStatus, birthDate, notes, tag
      } = req.body;

      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const updatedClient = await prisma.client.update({
        where: { id },
        data: {
          name,
          cpf,
          rg,
          email,
          phone,
          address: sanitizeString(address),
          city,
          state,
          zipCode,
          profession: sanitizeString(profession),
          maritalStatus: sanitizeString(maritalStatus),
          birthDate: birthDate ? new Date(birthDate) : null,
          notes: sanitizeString(notes),
          tag: sanitizeString(tag),
        },
      });

      res.json(updatedClient);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
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

      res.json({ message: 'Cliente desativado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
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
      const csvHeader = 'Nome,CPF,RG,Email,Telefone,Endereço,Cidade,Estado,CEP,Profissão,Estado Civil,Data de Nascimento,Observações,Data de Cadastro\n';

      // Linhas do CSV
      const csvRows = clients.map(client => {
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
        const notes = `"${(client.notes || '').replace(/"/g, '""')}"`;
        const createdAt = `"${new Date(client.createdAt).toLocaleDateString('pt-BR')}"`;

        return `${name},${cpf},${rg},${email},${phone},${address},${city},${state},${zipCode},${profession},${maritalStatus},${birthDate},${notes},${createdAt}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      // Configurar headers para download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.csv`);

      // Adicionar BOM para Excel reconhecer UTF-8
      res.send('\ufeff' + csv);
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
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
              name: record.Nome.trim(),
              cpf: record.CPF?.trim() || null,
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
              notes: record['Observações']?.trim() || null,
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            line: lineNumber,
            name: record.Nome || '(vazio)',
            error: error.message || 'Erro desconhecido',
          });
        }
      }

      res.json({
        message: 'Importação concluída',
        results,
      });
    } catch (error) {
      console.error('Erro ao importar clientes:', error);
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
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }
}

export default new ClientController();
