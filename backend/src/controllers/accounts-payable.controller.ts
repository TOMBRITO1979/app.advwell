import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import PDFDocument from 'pdfkit';
import { parse } from 'csv-parse/sync';
import { sanitizeString } from '../utils/sanitize';
import { appLogger } from '../utils/logger';
import * as pdfStyles from '../utils/pdfStyles';
import { enqueueCsvImport, getImportStatus } from '../queues/csv-import.queue';

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
      appLogger.error('Erro ao criar conta a pagar:', error as Error);
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
      appLogger.error('Erro ao listar contas a pagar:', error as Error);
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
      appLogger.error('Erro ao buscar conta:', error as Error);
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
      appLogger.error('Erro ao atualizar conta:', error as Error);
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
      appLogger.error('Erro ao excluir conta:', error as Error);
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
      appLogger.error('Erro ao marcar conta como paga:', error as Error);
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

      // Buscar nome da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=contas_a_pagar.pdf');

      doc.pipe(res);

      // Header moderno
      pdfStyles.addHeader(doc, 'Relatório de Contas a Pagar', `Total: ${accounts.length} contas`, company?.name);

      // Calculate totals
      const totalPending = accounts.filter(a => a.status === 'PENDING').reduce((sum, a) => sum + Number(a.amount), 0);
      const totalPaid = accounts.filter(a => a.status === 'PAID').reduce((sum, a) => sum + Number(a.amount), 0);
      const totalOverdue = accounts.filter(a => a.status === 'OVERDUE').reduce((sum, a) => sum + Number(a.amount), 0);
      const countPending = accounts.filter(a => a.status === 'PENDING').length;
      const countPaid = accounts.filter(a => a.status === 'PAID').length;
      const countOverdue = accounts.filter(a => a.status === 'OVERDUE').length;

      // Cards de resumo
      const cardWidth = 125;
      const cardHeight = 55;
      const margin = doc.page.margins.left;
      const cardY = doc.y;

      pdfStyles.addSummaryCard(
        doc, margin, cardY, cardWidth, cardHeight,
        `Pendentes (${countPending})`,
        pdfStyles.formatCurrency(totalPending),
        pdfStyles.colors.cardOrange  // Laranja suave - pendente
      );

      pdfStyles.addSummaryCard(
        doc, margin + cardWidth + 10, cardY, cardWidth, cardHeight,
        `Pagos (${countPaid})`,
        pdfStyles.formatCurrency(totalPaid),
        pdfStyles.colors.cardRed     // Vermelho suave - pago
      );

      pdfStyles.addSummaryCard(
        doc, margin + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight,
        `Vencidos (${countOverdue})`,
        pdfStyles.formatCurrency(totalOverdue),
        pdfStyles.colors.danger      // Vermelho forte - vencido/urgente
      );

      pdfStyles.addSummaryCard(
        doc, margin + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight,
        'Total Geral',
        pdfStyles.formatCurrency(totalPending + totalPaid + totalOverdue),
        pdfStyles.colors.cardBlue    // Azul suave - total
      );

      doc.y = cardY + cardHeight + 25;

      // Seção de detalhamento
      pdfStyles.addSection(doc, 'Detalhamento das Contas');

      // Tabela de contas
      const headers = ['Fornecedor', 'Descrição', 'Valor', 'Vencimento', 'Status'];
      const columnWidths = [130, 150, 80, 80, 65];

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'PAID': return 'Pago';
          case 'PENDING': return 'Pendente';
          case 'OVERDUE': return 'Vencido';
          default: return status;
        }
      };

      const rows = accounts.map(account => [
        account.supplier.substring(0, 22),
        account.description.substring(0, 25),
        pdfStyles.formatCurrency(Number(account.amount)),
        pdfStyles.formatDate(account.dueDate),
        getStatusLabel(account.status),
      ]);

      pdfStyles.addTable(doc, headers, rows, columnWidths);

      // Rodapé
      pdfStyles.addFooter(doc, 1, 1);

      doc.end();
    } catch (error) {
      appLogger.error('Erro ao gerar PDF:', error as Error);
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
        const dueDate = new Date(account.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
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
      appLogger.error('Erro ao gerar CSV:', error as Error);
      res.status(500).json({ error: 'Erro ao gerar CSV' });
    }
  }

  // Importar via CSV
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

      const csvContent = req.file.buffer.toString('utf-8').replace(/^\ufeff/, '');

      // Detectar delimitador (vírgula ou ponto e vírgula)
      const firstLine = csvContent.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter,
      });

      const MAX_CSV_ROWS = 500;
      if (records.length > MAX_CSV_ROWS) {
        return res.status(400).json({
          error: 'Arquivo muito grande',
          message: `O arquivo contém ${records.length} registros. O máximo permitido é ${MAX_CSV_ROWS} registros por importação.`,
          maxRows: MAX_CSV_ROWS,
          currentRows: records.length,
        });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'Arquivo CSV vazio' });
      }

      const jobId = await enqueueCsvImport('import-accounts-payable', companyId, userId, csvContent, records.length);

      res.status(202).json({
        message: 'Importação iniciada. O processamento ocorre em segundo plano.',
        jobId,
        totalRows: records.length,
        statusUrl: `/api/accounts-payable/import/status/${jobId}`,
      });
    } catch (error: any) {
      appLogger.error('Erro ao iniciar importação de contas a pagar', error as Error);
      res.status(500).json({ error: 'Erro ao iniciar importação de contas a pagar' });
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

  // Obter contas vencendo hoje (para notificação no sidebar)
  async getDueToday(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Usar query raw SQL para comparar apenas a data (ignorando timezone)
      // Isso garante que funcione corretamente independente do timezone do servidor
      const accounts = await prisma.$queryRaw<Array<{
        id: string;
        supplier: string;
        description: string;
        amount: number;
        dueDate: Date;
        category: string | null;
      }>>`
        SELECT id, supplier, description, amount, "dueDate", category
        FROM accounts_payable
        WHERE "companyId" = ${companyId}
          AND status = 'PENDING'
          AND DATE("dueDate") = CURRENT_DATE
        ORDER BY amount DESC
      `;

      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      res.json({
        count: accounts.length,
        total,
        accounts,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar contas vencendo hoje:', error as Error);
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
      appLogger.error('Erro ao buscar categorias:', error as Error);
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
      // Buscar contas onde paidDate está no período OU paidDate é null mas updatedAt está no período
      if (startDate && endDate) {
        const parsedStartDate = new Date(String(startDate));
        const parsedEndDate = new Date(String(endDate));
        // Ajustar endDate para incluir o final do dia (23:59:59.999) em UTC
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        where.OR = [
          // Contas com paidDate no período
          {
            paidDate: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
          // Contas sem paidDate mas com updatedAt no período (marcadas como pagas mas sem data específica)
          {
            paidDate: null,
            updatedAt: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
        ];
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
      appLogger.error('Erro ao gerar extrato:', error as Error);
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
        const parsedStartDate = new Date(String(startDate));
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        where.OR = [
          {
            paidDate: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
          {
            paidDate: null,
            updatedAt: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
        ];
      }

      if (category) {
        where.category = String(category);
      }

      const accounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { paidDate: 'asc' },
      });

      const total = accounts.reduce((sum, account) => sum + Number(account.amount), 0);

      // Buscar nome da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=extrato_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Header moderno
      let subtitleText = '';
      if (startDate && endDate) {
        subtitleText = `Período: ${pdfStyles.formatDate(String(startDate))} a ${pdfStyles.formatDate(String(endDate))}`;
      }
      pdfStyles.addHeader(doc, 'Extrato de Pagamentos', subtitleText, company?.name);

      // Cards de resumo
      const cardWidth = 170;
      const cardHeight = 55;
      const margin = doc.page.margins.left;
      const cardY = doc.y;

      pdfStyles.addSummaryCard(
        doc,
        margin,
        cardY,
        cardWidth,
        cardHeight,
        'Total de Pagamentos',
        String(accounts.length),
        pdfStyles.colors.cardBlue    // Azul suave - quantidade
      );

      pdfStyles.addSummaryCard(
        doc,
        margin + cardWidth + 15,
        cardY,
        cardWidth,
        cardHeight,
        'Valor Total Pago',
        pdfStyles.formatCurrency(total),
        pdfStyles.colors.cardRed     // Vermelho suave - pago
      );

      if (category) {
        pdfStyles.addSummaryCard(
          doc,
          margin + (cardWidth + 15) * 2,
          cardY,
          cardWidth,
          cardHeight,
          'Categoria',
          String(category),
          pdfStyles.colors.cardGray  // Cinza suave - categoria
        );
      }

      doc.y = cardY + cardHeight + 25;

      // Seção de detalhamento
      pdfStyles.addSection(doc, 'Detalhamento dos Pagamentos');

      // Tabela de pagamentos
      const headers = ['Fornecedor', 'Descrição', 'Categoria', 'Valor', 'Data Pgto'];
      const columnWidths = [120, 150, 80, 80, 75];

      const rows = accounts.map(account => [
        account.supplier.substring(0, 20),
        account.description.substring(0, 25),
        account.category || '-',
        pdfStyles.formatCurrency(Number(account.amount)),
        pdfStyles.formatDate(account.paidDate || account.dueDate),
      ]);

      pdfStyles.addTable(doc, headers, rows, columnWidths);

      // Rodapé
      pdfStyles.addFooter(doc, 1, 1);

      doc.end();
    } catch (error) {
      appLogger.error('Erro ao gerar PDF do extrato:', error as Error);
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
        const parsedStartDate = new Date(String(startDate));
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        where.OR = [
          {
            paidDate: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
          {
            paidDate: null,
            updatedAt: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
        ];
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
        const paidDate = new Date(account.paidDate || account.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const cat = account.category || '';

        return `${supplier},${description},${amount},${paidDate},${cat}`;
      }).join('\n');

      const csvFooter = `\n\n"TOTAL","",${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},"",""`;
      const csv = csvHeader + csvRows + csvFooter;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=extrato_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv);
    } catch (error) {
      appLogger.error('Erro ao gerar CSV do extrato:', error as Error);
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
