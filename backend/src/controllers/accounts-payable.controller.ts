import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import PDFDocument from 'pdfkit';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';

export class AccountsPayableController {
  // Criar nova conta a pagar
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        supplier, description, amount, dueDate, category, notes,
        isRecurring, recurrencePeriod, parentId
      } = req.body;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const account = await prisma.accountPayable.create({
        data: {
          companyId,
          supplier,
          description,
          amount: parseFloat(amount),
          dueDate: new Date(dueDate),
          category,
          notes,
          createdBy,
          isRecurring: isRecurring || false,
          recurrencePeriod: recurrencePeriod || null,
          parentId: parentId || null,
        },
      });

      res.status(201).json(account);
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      res.status(500).json({ error: 'Erro ao criar conta a pagar' });
    }
  }

  // Listar contas a pagar
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const {
        page = 1,
        limit = 20,
        search = '',
        status,
      } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {
        companyId,
      };

      // Filtro de busca
      if (search) {
        where.OR = [
          { supplier: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
        ];
      }

      // Filtro por status
      if (status) {
        where.status = status;
      }

      const [accounts, total] = await Promise.all([
        prisma.accountPayable.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { dueDate: 'asc' },
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }),
        prisma.accountPayable.count({ where }),
      ]);

      res.json({
        data: accounts,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error('Erro ao listar contas a pagar:', error);
      res.status(500).json({ error: 'Erro ao listar contas a pagar' });
    }
  }

  // Buscar conta específica
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      res.json(account);
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  }

  // Atualizar conta a pagar
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        supplier, description, amount, dueDate, paidDate, status, category, notes
      } = req.body;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      const updatedAccount = await prisma.accountPayable.update({
        where: { id },
        data: {
          supplier,
          description,
          amount: amount !== undefined ? parseFloat(amount) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          paidDate: paidDate ? new Date(paidDate) : null,
          status,
          category,
          notes,
        },
      });

      res.json(updatedAccount);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  }

  // Excluir conta a pagar
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      await prisma.accountPayable.delete({
        where: { id },
      });

      res.json({ message: 'Conta excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      res.status(500).json({ error: 'Erro ao excluir conta' });
    }
  }

  // Marcar como pago
  async markAsPaid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;
      const { paidDate } = req.body;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      // Marcar como paga
      const updatedAccount = await prisma.accountPayable.update({
        where: { id },
        data: {
          status: 'PAID',
          paidDate: paidDate ? new Date(paidDate) : new Date(),
        },
      });

      // Se for recorrente, criar a próxima conta
      if (account.isRecurring && account.recurrencePeriod) {
        const nextDueDate = this.calculateNextDueDate(account.dueDate, account.recurrencePeriod);

        await prisma.accountPayable.create({
          data: {
            companyId: account.companyId,
            supplier: account.supplier,
            description: account.description,
            amount: account.amount,
            dueDate: nextDueDate,
            category: account.category,
            notes: account.notes,
            createdBy: createdBy!,
            isRecurring: true,
            recurrencePeriod: account.recurrencePeriod,
            parentId: account.parentId || account.id, // Mantém o ID da conta original
          },
        });
      }

      res.json(updatedAccount);
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      res.status(500).json({ error: 'Erro ao marcar conta como paga' });
    }
  }

  // Exportar para PDF
  async exportPDF(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { search, status } = req.query;

      const where: any = { companyId };

      if (search) {
        where.OR = [
          { supplier: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
        ];
      }

      if (status) {
        where.status = status;
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { dueDate: 'asc' },
      });

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=contas_a_pagar.pdf');

      doc.pipe(res);

      // Header
      doc.fontSize(20).text('Relatório de Contas a Pagar', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      // Calculate totals
      const totalPending = accounts.filter(a => a.status === 'PENDING').reduce((sum, a) => sum + Number(a.amount), 0);
      const totalPaid = accounts.filter(a => a.status === 'PAID').reduce((sum, a) => sum + Number(a.amount), 0);
      const totalOverdue = accounts.filter(a => a.status === 'OVERDUE').reduce((sum, a) => sum + Number(a.amount), 0);

      // Summary
      doc.fontSize(12).text('Resumo:', { underline: true });
      doc.fontSize(10);
      doc.text(`Total Pendente: R$ ${totalPending.toFixed(2)}`);
      doc.text(`Total Pago: R$ ${totalPaid.toFixed(2)}`);
      doc.text(`Total Vencido: R$ ${totalOverdue.toFixed(2)}`);
      doc.text(`Total Geral: R$ ${(totalPending + totalPaid + totalOverdue).toFixed(2)}`);
      doc.moveDown(2);

      // Table header
      doc.fontSize(12).text('Detalhamento:', { underline: true });
      doc.moveDown();

      // Accounts list
      accounts.forEach((account, index) => {
        if ((index + 1) % 15 === 0) doc.addPage();

        doc.fontSize(10);
        doc.text(`${index + 1}. ${account.supplier}`, { continued: false });
        doc.fontSize(9);
        doc.text(`   Descrição: ${account.description}`);
        doc.text(`   Valor: R$ ${Number(account.amount).toFixed(2)}`);
        doc.text(`   Vencimento: ${new Date(account.dueDate).toLocaleDateString('pt-BR')}`);
        doc.text(`   Status: ${account.status === 'PAID' ? 'Pago' : account.status === 'PENDING' ? 'Pendente' : 'Vencido'}`);
        if (account.notes) doc.text(`   Observações: ${account.notes}`);
        doc.moveDown();
      });

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
  }

  // Exportar para CSV
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { search, status } = req.query;

      const where: any = { companyId };

      if (search) {
        where.OR = [
          { supplier: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
        ];
      }

      if (status) {
        where.status = status;
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { dueDate: 'asc' },
      });

      const csvHeader = 'Fornecedor,Descrição,Valor,Vencimento,Status,Categoria,Observações\n';
      const csvRows = accounts.map(account => {
        const supplier = `"${account.supplier.replace(/"/g, '""')}"`;
        const description = `"${account.description.replace(/"/g, '""')}"`;
        const amount = Number(account.amount).toFixed(2);
        const dueDate = new Date(account.dueDate).toLocaleDateString('pt-BR');
        const status = account.status === 'PAID' ? 'Pago' : account.status === 'PENDING' ? 'Pendente' : 'Vencido';
        const category = account.category || '';
        const notes = account.notes ? `"${account.notes.replace(/"/g, '""')}"` : '';

        return `${supplier},${description},${amount},${dueDate},${status},${category},${notes}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=contas_a_pagar.csv');
      res.send('\ufeff' + csv);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      res.status(500).json({ error: 'Erro ao gerar CSV' });
    }
  }

  // Importar via CSV
  async importCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });

      const results = {
        total: records.length,
        success: 0,
        errors: [] as { line: number; supplier: string; error: string }[],
      };

      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        const lineNumber = i + 2;

        try {
          // Validar campos obrigatórios
          if (!record.Fornecedor || record.Fornecedor.trim() === '') {
            results.errors.push({
              line: lineNumber,
              supplier: record.Fornecedor || '(vazio)',
              error: 'Fornecedor é obrigatório',
            });
            continue;
          }

          if (!record['Descrição'] || record['Descrição'].trim() === '') {
            results.errors.push({
              line: lineNumber,
              supplier: record.Fornecedor || '(vazio)',
              error: 'Descrição é obrigatória',
            });
            continue;
          }

          if (!record.Valor || isNaN(parseFloat(record.Valor.replace(',', '.')))) {
            results.errors.push({
              line: lineNumber,
              supplier: record.Fornecedor || '(vazio)',
              error: 'Valor deve ser um número válido',
            });
            continue;
          }

          if (!record.Vencimento) {
            results.errors.push({
              line: lineNumber,
              supplier: record.Fornecedor || '(vazio)',
              error: 'Vencimento é obrigatório',
            });
            continue;
          }

          // Converter valor
          const amount = parseFloat(record.Valor.replace(',', '.'));

          // Converter data
          let dueDate: Date;
          const dateStr = record.Vencimento.trim();
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            dueDate = new Date(`${year}-${month}-${day}`);
          } else {
            dueDate = new Date(dateStr);
          }

          if (isNaN(dueDate.getTime())) {
            results.errors.push({
              line: lineNumber,
              supplier: record.Fornecedor || '(vazio)',
              error: 'Data de vencimento inválida (use DD/MM/YYYY ou YYYY-MM-DD)',
            });
            continue;
          }

          // Criar conta a pagar
          await prisma.accountPayable.create({
            data: {
              companyId,
              supplier: sanitizeString(record.Fornecedor.trim()) || record.Fornecedor.trim(),
              description: sanitizeString(record['Descrição'].trim()) || record['Descrição'].trim(),
              amount,
              dueDate,
              category: record.Categoria?.trim() || null,
              notes: record['Observações'] ? (sanitizeString(record['Observações'].trim()) || record['Observações'].trim()) : null,
              createdBy,
              status: 'PENDING',
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            line: lineNumber,
            supplier: record.Fornecedor || '(vazio)',
            error: error.message || 'Erro ao processar linha',
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error('Erro ao importar CSV:', error);
      res.status(500).json({ error: 'Erro ao importar arquivo CSV' });
    }
  }

  // Obter contas vencendo hoje (para notificação no sidebar)
  async getDueToday(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Calcular início e fim do dia atual (timezone Brasil)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const accounts = await prisma.accountPayable.findMany({
        where: {
          companyId,
          status: 'PENDING',
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          supplier: true,
          description: true,
          amount: true,
          dueDate: true,
          category: true,
        },
        orderBy: { amount: 'desc' },
      });

      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      res.json({
        count: accounts.length,
        total,
        accounts,
      });
    } catch (error) {
      console.error('Erro ao buscar contas vencendo hoje:', error);
      res.status(500).json({ error: 'Erro ao buscar contas vencendo hoje' });
    }
  }

  // Obter categorias únicas
  async getCategories(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const accounts = await prisma.accountPayable.findMany({
        where: {
          companyId: companyId!,
          category: { not: null },
        },
        select: {
          category: true,
        },
        distinct: ['category'],
      });

      const categories = accounts.map(a => a.category).filter(Boolean);

      res.json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  // Gerar extrato com filtros
  async generateStatement(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate, category } = req.query;

      const where: any = { companyId, status: 'PAID' };

      // Filtro por data (data de pagamento)
      if (startDate && endDate) {
        where.paidDate = {
          gte: new Date(String(startDate)),
          lte: new Date(String(endDate)),
        };
      }

      // Filtro por categoria
      if (category) {
        where.category = String(category);
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { paidDate: 'asc' },
      });

      // Calcular total
      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      res.json({
        accounts,
        total,
        count: accounts.length,
        period: { startDate, endDate },
        category: category || 'Todas',
      });
    } catch (error) {
      console.error('Erro ao gerar extrato:', error);
      res.status(500).json({ error: 'Erro ao gerar extrato' });
    }
  }

  // Exportar extrato para PDF
  async exportStatementPDF(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate, category } = req.query;

      const where: any = { companyId, status: 'PAID' };

      if (startDate && endDate) {
        where.paidDate = {
          gte: new Date(String(startDate)),
          lte: new Date(String(endDate)),
        };
      }

      if (category) {
        where.category = String(category);
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { paidDate: 'asc' },
      });

      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=extrato_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Header
      doc.fontSize(20).text('Extrato de Pagamentos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      // Período
      if (startDate && endDate) {
        doc.fontSize(12).text('Período:', { underline: true });
        doc.fontSize(10);
        doc.text(`De: ${new Date(String(startDate)).toLocaleDateString('pt-BR')}`);
        doc.text(`Até: ${new Date(String(endDate)).toLocaleDateString('pt-BR')}`);
        doc.moveDown();
      }

      // Categoria
      if (category) {
        doc.fontSize(12).text('Categoria:', { underline: true });
        doc.fontSize(10).text(String(category));
        doc.moveDown();
      }

      // Resumo
      doc.fontSize(14).text('Resumo:', { underline: true });
      doc.fontSize(12);
      doc.text(`Total de Pagamentos: ${accounts.length}`);
      doc.text(`Valor Total Pago: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      doc.moveDown(2);

      // Detalhamento
      doc.fontSize(12).text('Detalhamento:', { underline: true });
      doc.moveDown();

      accounts.forEach((account, index) => {
        if ((index + 1) % 12 === 0) doc.addPage();

        doc.fontSize(10);
        doc.text(`${index + 1}. ${account.supplier}`, { continued: false });
        doc.fontSize(9);
        doc.text(`   Descrição: ${account.description}`);
        doc.text(`   Valor: R$ ${Number(account.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        doc.text(`   Data de Pagamento: ${new Date(account.paidDate || account.dueDate).toLocaleDateString('pt-BR')}`);
        if (account.category) doc.text(`   Categoria: ${account.category}`);
        doc.moveDown();
      });

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF do extrato:', error);
      res.status(500).json({ error: 'Erro ao gerar PDF do extrato' });
    }
  }

  // Exportar extrato para CSV
  async exportStatementCSV(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate, category } = req.query;

      const where: any = { companyId, status: 'PAID' };

      if (startDate && endDate) {
        where.paidDate = {
          gte: new Date(String(startDate)),
          lte: new Date(String(endDate)),
        };
      }

      if (category) {
        where.category = String(category);
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { paidDate: 'asc' },
      });

      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      const csvHeader = 'Fornecedor,Descrição,Valor,Data de Pagamento,Categoria\n';
      const csvRows = accounts.map(account => {
        const supplier = `"${account.supplier.replace(/"/g, '""')}"`;
        const description = `"${account.description.replace(/"/g, '""')}"`;
        const amount = Number(account.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const paidDate = new Date(account.paidDate || account.dueDate).toLocaleDateString('pt-BR');
        const cat = account.category || '';

        return `${supplier},${description},${amount},${paidDate},${cat}`;
      }).join('\n');

      const csvFooter = `\n\n"TOTAL","",${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},"",""`;
      const csv = csvHeader + csvRows + csvFooter;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=extrato_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv);
    } catch (error) {
      console.error('Erro ao gerar CSV do extrato:', error);
      res.status(500).json({ error: 'Erro ao gerar CSV do extrato' });
    }
  }

  // Calcular próxima data de vencimento
  private calculateNextDueDate(currentDueDate: Date, period: string): Date {
    const nextDate = new Date(currentDueDate);

    switch (period) {
      case 'DAYS_15':
        nextDate.setDate(nextDate.getDate() + 15);
        break;
      case 'DAYS_30':
        nextDate.setDate(nextDate.getDate() + 30);
        break;
      case 'MONTHS_6':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'YEAR_1':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default: mensal
    }

    return nextDate;
  }
}

export default new AccountsPayableController();
