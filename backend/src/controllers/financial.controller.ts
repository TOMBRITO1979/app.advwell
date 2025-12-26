import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { parse } from 'csv-parse/sync';
import { Decimal } from '@prisma/client/runtime/library';
import { appLogger } from '../utils/logger';
import * as pdfStyles from '../utils/pdfStyles';

// Helper para converter Prisma Decimal para number (necessário após migração Float → Decimal)
const toNumber = (value: Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
};

// Listar transações financeiras com filtros e paginação
export const listTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { companyId };

    // Filtro por busca (descrição ou nome do cliente)
    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
        { client: { cpf: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    // Filtro por período (data inicial e final)
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(String(startDate));
      }
      if (endDate) {
        // Ajustar endDate para incluir o final do dia (23:59:59.999)
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);
        where.date.lte = parsedEndDate;
      }
    }

    // Filtro por cliente
    if (clientId) {
      where.clientId = String(clientId);
    }

    // Filtro por processo
    if (caseId) {
      where.caseId = String(caseId);
    }

    // Filtro por tipo
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type;
    }

    const transactions = await prisma.financialTransaction.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
          case: {
            select: {
              id: true,
              processNumber: true,
              subject: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      });

    // Calcular resumo financeiro
    const [incomeTotal, expenseTotal] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = toNumber(incomeTotal._sum.amount);
    const totalExpense = toNumber(expenseTotal._sum.amount);
    const balance = totalIncome - totalExpense;

    res.json({
      data: transactions,
      summary: {
        totalIncome,
        totalExpense,
        balance,
      }
    });
  } catch (error) {
    appLogger.error('Erro ao listar transações', error as Error);
    res.status(500).json({ error: 'Erro ao listar transações financeiras' });
  }
};

// Buscar transação por ID
export const getTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const transaction = await prisma.financialTransaction.findFirst({
      where: { id, companyId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
            email: true,
            phone: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
            court: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json(transaction);
  } catch (error) {
    appLogger.error('Erro ao buscar transação', error as Error);
    res.status(500).json({ error: 'Erro ao buscar transação' });
  }
};

// Criar nova transação
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, caseId, type, description, amount, date, isInstallment, installmentCount, installmentInterval } = req.body;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    // Validações
    if (!clientId || !type || !description || !amount) {
      return res.status(400).json({ error: 'Campos obrigatórios: clientId, type, description, amount' });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Tipo deve ser INCOME ou EXPENSE' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valor deve ser um número positivo' });
    }

    // Validações de parcelamento
    if (isInstallment) {
      if (!installmentCount || installmentCount < 2) {
        return res.status(400).json({ error: 'Número de parcelas deve ser no mínimo 2' });
      }
      if (installmentInterval && installmentInterval < 1) {
        return res.status(400).json({ error: 'Intervalo entre parcelas deve ser pelo menos 1 dia' });
      }
    }

    // Verificar se o cliente existe e pertence à empresa
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Se fornecido, verificar se o processo existe e pertence à empresa
    if (caseId) {
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, companyId },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        companyId,
        clientId,
        caseId: caseId || null,
        type,
        description: sanitizeString(description) || '',
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        isInstallment: isInstallment || false,
        installmentCount: isInstallment ? parseInt(installmentCount) : null,
        installmentInterval: isInstallment ? (installmentInterval ? parseInt(installmentInterval) : 30) : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
      },
    });

    // Se for parcelado, criar as parcelas automaticamente
    if (isInstallment && installmentCount) {
      const installmentAmount = parseFloat(amount) / parseInt(installmentCount);
      const interval = installmentInterval ? parseInt(installmentInterval) : 30;
      const startDate = date ? new Date(date) : new Date();

      const installments = [];
      for (let i = 1; i <= parseInt(installmentCount); i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i - 1) * interval);

        installments.push({
          id: require('crypto').randomUUID(),
          financialTransactionId: transaction.id,
          companyId, // TAREFA 4.3: Isolamento de tenant direto
          installmentNumber: i,
          amount: installmentAmount,
          dueDate,
          status: 'PENDING' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await prisma.installmentPayment.createMany({
        data: installments,
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    appLogger.error('Erro ao criar transação', error as Error);
    res.status(500).json({ error: 'Erro ao criar transação financeira' });
  }
};

// Atualizar transação
export const updateTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { clientId, caseId, type, description, amount, date } = req.body;
    const companyId = req.user!.companyId;

    // Verificar se a transação existe e pertence à empresa
    const existingTransaction = await prisma.financialTransaction.findFirst({
      where: { id, companyId },
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Validações
    if (type && type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Tipo deve ser INCOME ou EXPENSE' });
    }

    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      return res.status(400).json({ error: 'Valor deve ser um número positivo' });
    }

    // Se alterar o cliente, verificar se existe
    if (clientId && clientId !== existingTransaction.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    // Se alterar o processo, verificar se existe
    if (caseId !== undefined) {
      if (caseId) {
        const caseExists = await prisma.case.findFirst({
          where: { id: caseId, companyId },
        });

        if (!caseExists) {
          return res.status(404).json({ error: 'Processo não encontrado' });
        }
      }
    }

    const transaction = await prisma.financialTransaction.update({
      where: { id },
      data: {
        ...(clientId && { clientId }),
        ...(caseId !== undefined && { caseId: caseId || null }),
        ...(type && { type }),
        ...(description && { description: sanitizeString(description) }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cpf: true,
          },
        },
        case: {
          select: {
            id: true,
            processNumber: true,
            subject: true,
          },
        },
      },
    });

    res.json(transaction);
  } catch (error) {
    appLogger.error('Erro ao atualizar transação', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
};

// Excluir transação
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Verificar se a transação existe e pertence à empresa
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id, companyId },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    await prisma.financialTransaction.delete({
      where: { id },
    });

    res.json({ message: 'Transação excluída com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao excluir transação', error as Error);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
};

// Obter resumo financeiro
export const getFinancialSummary = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { startDate, endDate, clientId, caseId } = req.query;

    const where: any = { companyId };

    // Filtro por período
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) {
        // Ajustar endDate para incluir o final do dia (23:59:59.999)
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);
        where.date.lte = parsedEndDate;
      }
    }

    // Filtro por cliente
    if (clientId) where.clientId = String(clientId);

    // Filtro por processo
    if (caseId) where.caseId = String(caseId);

    const [incomeTotal, expenseTotal, totalCount, incomeCount, expenseCount] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.count({ where }),
      prisma.financialTransaction.count({ where: { ...where, type: 'INCOME' } }),
      prisma.financialTransaction.count({ where: { ...where, type: 'EXPENSE' } }),
    ]);

    const totalIncome = toNumber(incomeTotal._sum.amount);
    const totalExpense = toNumber(expenseTotal._sum.amount);
    const balance = totalIncome - totalExpense;

    res.json({
      data: {
        totalIncome,
        totalExpense,
        balance,
        totalTransactions: totalCount,
        incomeTransactions: incomeCount,
        expenseTransactions: expenseCount,
      }
    });
  } catch (error) {
    appLogger.error('Erro ao buscar resumo financeiro', error as Error);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
  }
};

// Exportar transações para PDF
export const exportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type, startDate, endDate } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
        { client: { cpf: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    // Filtro por período (data inicial e final)
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(String(startDate));
      }
      if (endDate) {
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);
        where.date.lte = parsedEndDate;
      }
    }

    if (clientId) where.clientId = String(clientId);
    if (caseId) where.caseId = String(caseId);
    if (type && (type === 'INCOME' || type === 'EXPENSE')) where.type = type;

    // Buscar dados da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        logo: true,
      },
    });

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        client: { select: { name: true, cpf: true } },
        case: { select: { processNumber: true } },
      },
      orderBy: { date: 'desc' },
    });

    const [incomeTotal, expenseTotal] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = toNumber(incomeTotal._sum.amount);
    const totalExpense = toNumber(expenseTotal._sum.amount);
    const balance = totalIncome - totalExpense;

    // Generate PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_financeiro.pdf');

    doc.pipe(res);

    // Header moderno
    let subtitleText = `${transactions.length} transações`;
    if (startDate && endDate) {
      subtitleText += ` | ${pdfStyles.formatDate(String(startDate))} a ${pdfStyles.formatDate(String(endDate))}`;
    }
    pdfStyles.addHeader(doc, 'Relatório Financeiro', subtitleText, company?.name);

    // Cards de resumo
    const cardWidth = 165;
    const cardHeight = 55;
    const margin = doc.page.margins.left;
    const cardY = doc.y;

    pdfStyles.addSummaryCard(
      doc, margin, cardY, cardWidth, cardHeight,
      'Total de Receitas',
      pdfStyles.formatCurrency(totalIncome),
      pdfStyles.colors.cardGreen  // Verde suave - faturado
    );

    pdfStyles.addSummaryCard(
      doc, margin + cardWidth + 10, cardY, cardWidth, cardHeight,
      'Total de Despesas',
      pdfStyles.formatCurrency(totalExpense),
      pdfStyles.colors.cardRed    // Vermelho suave - pago/saída
    );

    pdfStyles.addSummaryCard(
      doc, margin + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight,
      'Saldo',
      pdfStyles.formatCurrency(balance),
      pdfStyles.colors.cardBlue   // Azul suave - saldo/devido
    );

    doc.y = cardY + cardHeight + 25;

    // Seção de transações
    pdfStyles.addSection(doc, 'Detalhamento das Transações');

    // Tabela de transações
    const headers = ['Data', 'Tipo', 'Cliente', 'Descrição', 'Valor'];
    const columnWidths = [70, 60, 120, 150, 105];

    const rows = transactions.map(transaction => [
      pdfStyles.formatDate(transaction.date),
      transaction.type === 'INCOME' ? 'Receita' : 'Despesa',
      transaction.client?.name?.substring(0, 20) || '-',
      transaction.description.substring(0, 25),
      pdfStyles.formatCurrency(toNumber(transaction.amount)),
    ]);

    pdfStyles.addTable(doc, headers, rows, columnWidths);

    // Rodapé
    pdfStyles.addFooter(doc, 1, 1);

    doc.end();
  } catch (error) {
    appLogger.error('Erro ao gerar PDF', error as Error);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
};

// Exportar transações para CSV
export const exportCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type, startDate, endDate } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
        { client: { cpf: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    // Filtro por período (data inicial e final)
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(String(startDate));
      }
      if (endDate) {
        const parsedEndDate = new Date(String(endDate));
        parsedEndDate.setUTCHours(23, 59, 59, 999);
        where.date.lte = parsedEndDate;
      }
    }

    if (clientId) where.clientId = String(clientId);
    if (caseId) where.caseId = String(caseId);
    if (type && (type === 'INCOME' || type === 'EXPENSE')) where.type = type;

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        client: { select: { name: true, cpf: true } },
        case: { select: { processNumber: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Generate CSV
    const csvHeader = 'Data,Tipo,Cliente,CPF,Descrição,Processo,Valor\n';
    const csvRows = transactions.map(transaction => {
      const date = new Date(transaction.date).toLocaleDateString('pt-BR');
      const type = transaction.type === 'INCOME' ? 'Receita' : 'Despesa';
      const clientName = `"${transaction.client.name}"`;
      const cpf = transaction.client.cpf || '';
      const description = `"${transaction.description.replace(/"/g, '""')}"`;
      const processNum = transaction.case?.processNumber || '';
      const amount = transaction.amount.toFixed(2);

      return `${date},${type},${clientName},${cpf},${description},${processNum},${amount}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_financeiro.csv');
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 recognition
  } catch (error) {
    appLogger.error('Erro ao gerar CSV', error as Error);
    res.status(500).json({ error: 'Erro ao gerar CSV' });
  }
};

// Importar transações via CSV
export const importCSV = async (req: AuthRequest, res: Response) => {
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
      errors: [] as { line: number; description: string; error: string }[],
    };

    // Processar cada linha
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2; // +2 porque linha 1 é header e array começa em 0

      try {
        // Validar campos obrigatórios
        if (!record.Tipo || (record.Tipo.trim() !== 'Receita' && record.Tipo.trim() !== 'Despesa' && record.Tipo.trim() !== 'INCOME' && record.Tipo.trim() !== 'EXPENSE')) {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: 'Tipo deve ser "Receita", "Despesa", "INCOME" ou "EXPENSE"',
          });
          continue;
        }

        if (!record.Cliente || record.Cliente.trim() === '') {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: 'Cliente é obrigatório',
          });
          continue;
        }

        if (!record['Descrição'] || record['Descrição'].trim() === '') {
          results.errors.push({
            line: lineNumber,
            description: record.Cliente || '(vazio)',
            error: 'Descrição é obrigatória',
          });
          continue;
        }

        if (!record.Valor || isNaN(parseFloat(record.Valor.replace(',', '.')))) {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: 'Valor deve ser um número válido',
          });
          continue;
        }

        if (!record.Data) {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: 'Data é obrigatória',
          });
          continue;
        }

        // Converter tipo
        const type = (record.Tipo.trim() === 'Receita' || record.Tipo.trim() === 'INCOME') ? 'INCOME' : 'EXPENSE';

        // Buscar cliente por nome ou CPF
        const clientSearch = record.Cliente.trim();
        const client = await prisma.client.findFirst({
          where: {
            companyId,
            OR: [
              { name: { contains: clientSearch, mode: 'insensitive' } },
              { cpf: clientSearch },
            ],
          },
        });

        if (!client) {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: `Cliente "${clientSearch}" não encontrado`,
          });
          continue;
        }

        // Buscar processo se fornecido
        let caseId = null;
        if (record.Processo && record.Processo.trim() !== '') {
          const processNumber = record.Processo.trim();
          const caseFound = await prisma.case.findFirst({
            where: {
              companyId,
              processNumber: { contains: processNumber, mode: 'insensitive' },
            },
          });

          if (caseFound) {
            caseId = caseFound.id;
          } else {
            results.errors.push({
              line: lineNumber,
              description: record['Descrição'] || '(vazio)',
              error: `Processo "${processNumber}" não encontrado (transação será criada sem processo)`,
            });
          }
        }

        // Converter valor
        const amount = parseFloat(record.Valor.replace(',', '.'));

        // Converter data (aceita DD/MM/YYYY ou YYYY-MM-DD)
        let date: Date;
        const dateStr = record.Data.trim();
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          date = new Date(`${year}-${month}-${day}`);
        } else {
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          results.errors.push({
            line: lineNumber,
            description: record['Descrição'] || '(vazio)',
            error: 'Data inválida (use DD/MM/YYYY ou YYYY-MM-DD)',
          });
          continue;
        }

        // Criar transação
        await prisma.financialTransaction.create({
          data: {
            companyId,
            clientId: client.id,
            caseId,
            type,
            description: sanitizeString(record['Descrição'].trim()) || record['Descrição'].trim(),
            amount,
            date,
          },
        });

        results.success++;
      } catch (error: any) {
        results.errors.push({
          line: lineNumber,
          description: record['Descrição'] || '(vazio)',
          error: 'Erro ao processar linha', // Safe: no error.message exposure
        });
      }
    }

    res.json(results);
  } catch (error: any) {
    appLogger.error('Erro ao importar CSV', error as Error);
    res.status(500).json({ error: 'Erro ao importar arquivo CSV' });
  }
};

// ==================== FUNÇÕES DE PARCELAMENTO ====================

// Listar parcelas de uma transação
export const listInstallments = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const companyId = req.user!.companyId;

    // Verificar se a transação existe e pertence à empresa
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id: transactionId, companyId },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    const installments = await prisma.installmentPayment.findMany({
      where: { financialTransactionId: transactionId },
      orderBy: { installmentNumber: 'asc' },
    });

    res.json(installments);
  } catch (error) {
    appLogger.error('Erro ao listar parcelas', error as Error);
    res.status(500).json({ error: 'Erro ao listar parcelas' });
  }
};

// Atualizar uma parcela específica (marcar como paga, adicionar notas, etc.)
export const updateInstallment = async (req: AuthRequest, res: Response) => {
  try {
    const { installmentId } = req.params;
    const { paidDate, paidAmount, status, notes, receiptUrl } = req.body;
    const companyId = req.user!.companyId;

    // Verificar se a parcela existe e pertence à empresa
    const installment = await prisma.installmentPayment.findFirst({
      where: {
        id: installmentId,
        financialTransaction: { companyId },
      },
      include: {
        financialTransaction: true,
      },
    });

    if (!installment) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    // Validações
    if (status && !['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const updatedInstallment = await prisma.installmentPayment.update({
      where: { id: installmentId },
      data: {
        ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(paidAmount !== undefined && { paidAmount: paidAmount ? parseFloat(paidAmount) : null }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(receiptUrl !== undefined && { receiptUrl }),
      },
    });

    res.json(updatedInstallment);
  } catch (error) {
    appLogger.error('Erro ao atualizar parcela', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar parcela' });
  }
};

// Gerar PDF de recibo/comprovante para uma transação específica
export const generateTransactionReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Buscar transação com todos os dados relacionados
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        case: {
          select: {
            processNumber: true,
            subject: true,
            court: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Buscar dados da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        cnpj: true,
        logo: true,
      },
    });

    // Calcular valores para parcelamento
    let totalPaid = 0;
    let valorDevido = toNumber(transaction.amount);

    if (transaction.isInstallment && transaction.installments.length > 0) {
      totalPaid = transaction.installments.reduce((sum, inst) => {
        return sum + toNumber(inst.paidAmount);
      }, 0);
      valorDevido = toNumber(transaction.amount) - totalPaid;
    }

    // Gerar PDF usando PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    // Definir tipo do documento baseado no tipo de transação
    const isIncome = transaction.type === 'INCOME';
    const documentTitle = isIncome ? 'RECIBO DE PAGAMENTO' : 'COMPROVANTE DE PAGAMENTO';
    const documentSubtitle = isIncome ? 'Receita' : 'Despesa';

    const filename = `${isIncome ? 'recibo' : 'comprovante'}_${transaction.id.substring(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // ==================== HEADER MODERNO ====================
    pdfStyles.addHeader(doc, documentTitle, `${documentSubtitle} - Nº ${transaction.id.substring(0, 8).toUpperCase()}`, company?.name);

    // ==================== DADOS DA EMPRESA ====================
    if (company) {
      doc.fontSize(pdfStyles.fonts.small).fillColor(pdfStyles.colors.gray);
      const companyInfo = [];
      if (company.cnpj) companyInfo.push(`CNPJ: ${company.cnpj}`);
      if (company.address) companyInfo.push(company.address);
      if (company.city) companyInfo.push(company.city);
      if (company.state) companyInfo.push(company.state);
      if (company.phone) companyInfo.push(`Tel: ${company.phone}`);
      if (company.email) companyInfo.push(company.email);
      doc.text(companyInfo.join(' | '), { align: 'center' });
      doc.fillColor(pdfStyles.colors.black);
      doc.moveDown(1.5);
    }

    // ==================== DADOS DO CLIENTE ====================
    pdfStyles.addSection(doc, 'Dados do Cliente');
    pdfStyles.addKeyValue(doc, 'Nome', transaction.client.name);
    if (transaction.client.cpf) {
      pdfStyles.addKeyValue(doc, 'CPF/CNPJ', transaction.client.cpf);
    }
    if (transaction.client.email) {
      pdfStyles.addKeyValue(doc, 'E-mail', transaction.client.email);
    }
    if (transaction.client.phone) {
      pdfStyles.addKeyValue(doc, 'Telefone', transaction.client.phone);
    }
    if (transaction.client.address) {
      pdfStyles.addKeyValue(doc, 'Endereço', transaction.client.address);
    }
    doc.moveDown(1);

    // ==================== DADOS DA TRANSAÇÃO ====================
    pdfStyles.addSection(doc, 'Detalhes da Transação');
    pdfStyles.addKeyValue(doc, 'Descrição', transaction.description);
    pdfStyles.addKeyValue(doc, 'Data', pdfStyles.formatDate(transaction.date));

    if (transaction.case) {
      pdfStyles.addKeyValue(doc, 'Processo Vinculado', transaction.case.processNumber);
      if (transaction.case.subject) {
        pdfStyles.addKeyValue(doc, 'Assunto', transaction.case.subject);
      }
      if (transaction.case.court) {
        pdfStyles.addKeyValue(doc, 'Tribunal', transaction.case.court);
      }
    }
    doc.moveDown(1);

    // ==================== VALORES ====================
    pdfStyles.addSection(doc, 'Valores');

    // Verificar se é parcelado
    if (transaction.isInstallment && transaction.installmentCount) {
      pdfStyles.addKeyValue(doc, 'Tipo de Pagamento', 'Parcelado');
      pdfStyles.addKeyValue(doc, 'Número de Parcelas', `${transaction.installmentCount}x`);
      if (transaction.installmentInterval) {
        pdfStyles.addKeyValue(doc, 'Intervalo entre Parcelas', `${transaction.installmentInterval} dias`);
      }
      doc.moveDown(0.5);
      doc.fontSize(pdfStyles.fonts.heading).fillColor(pdfStyles.colors.primary);
      doc.text(`Valor Total: ${pdfStyles.formatCurrency(toNumber(transaction.amount))}`);
      doc.fillColor(pdfStyles.colors.black);
      pdfStyles.addKeyValue(doc, 'Valor por Parcela', pdfStyles.formatCurrency(toNumber(transaction.amount) / (transaction.installmentCount || 1)));
      doc.moveDown(0.5);
      pdfStyles.addKeyValue(doc, 'Total Pago', pdfStyles.formatCurrency(totalPaid));
      doc.fillColor(valorDevido > 0 ? pdfStyles.colors.danger : pdfStyles.colors.success);
      pdfStyles.addKeyValue(doc, 'Valor Devido', pdfStyles.formatCurrency(valorDevido));
      doc.fillColor(pdfStyles.colors.black);

      // Tabela de parcelas
      if (transaction.installments.length > 0) {
        doc.moveDown(1);
        pdfStyles.addSection(doc, 'Detalhamento das Parcelas');

        const headers = ['Parcela', 'Valor', 'Vencimento', 'Status', 'Pago'];
        const rows = transaction.installments.map(inst => {
          const statusLabels: Record<string, string> = {
            PENDING: 'Pendente',
            PAID: 'Pago',
            OVERDUE: 'Atrasado',
            CANCELLED: 'Cancelado',
          };
          const status = inst.paidAmount && toNumber(inst.paidAmount) >= toNumber(inst.amount) ? 'Pago' : statusLabels[inst.status] || 'Pendente';
          return [
            `${inst.installmentNumber}ª`,
            pdfStyles.formatCurrency(toNumber(inst.amount)),
            pdfStyles.formatDate(inst.dueDate),
            status,
            inst.paidAmount ? pdfStyles.formatCurrency(toNumber(inst.paidAmount)) : '-',
          ];
        });
        pdfStyles.addTable(doc, headers, rows, [60, 100, 100, 80, 100]);
      }
    } else {
      pdfStyles.addKeyValue(doc, 'Tipo de Pagamento', 'À Vista');
      doc.moveDown(0.5);
      doc.fontSize(pdfStyles.fonts.subtitle).fillColor(pdfStyles.colors.primary);
      doc.text(`Valor Total: ${pdfStyles.formatCurrency(toNumber(transaction.amount))}`);
      doc.fillColor(pdfStyles.colors.black);
    }

    doc.moveDown(2);

    // ==================== LINHA DE ASSINATURA ====================
    pdfStyles.addDivider(doc);
    doc.moveDown(1);

    // Área de assinatura
    doc.fontSize(pdfStyles.fonts.body).fillColor(pdfStyles.colors.gray);
    const signatureY = doc.y;

    // Assinatura do recebedor/pagador
    doc.text('_________________________________', 100, signatureY);
    doc.text(isIncome ? 'Assinatura do Pagador' : 'Assinatura do Beneficiário', 100, signatureY + 15);

    doc.text('_________________________________', 350, signatureY);
    doc.text(isIncome ? 'Assinatura do Recebedor' : 'Assinatura do Responsável', 350, signatureY + 15);
    doc.fillColor(pdfStyles.colors.black);

    // ==================== RODAPÉ ====================
    doc.moveDown(4);
    doc.fontSize(pdfStyles.fonts.tiny).fillColor(pdfStyles.colors.gray);
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.text('Este documento é válido como comprovante de transação.', { align: 'center' });
    doc.fillColor(pdfStyles.colors.black);

    doc.end();
  } catch (error) {
    appLogger.error('Erro ao gerar recibo', error as Error);
    res.status(500).json({ error: 'Erro ao gerar recibo da transação' });
  }
};

// Gerar PDF de recibo para uma parcela específica
export const generateInstallmentReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { installmentId } = req.params;
    const companyId = req.user!.companyId;

    // Buscar parcela com todos os dados relacionados
    const installment = await prisma.installmentPayment.findFirst({
      where: {
        id: installmentId,
        financialTransaction: { companyId },
      },
      include: {
        financialTransaction: {
          include: {
            client: true,
            case: {
              select: {
                processNumber: true,
                subject: true,
                court: true,
              },
            },
          },
        },
      },
    });

    if (!installment) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    // Buscar todas as parcelas da transação para calcular valores
    const allInstallments = await prisma.installmentPayment.findMany({
      where: {
        financialTransactionId: installment.financialTransactionId,
      },
      orderBy: { installmentNumber: 'asc' },
    });

    // Calcular total já pago (soma de todos os paidAmount)
    const totalPaid = allInstallments.reduce((sum, inst) => {
      return sum + toNumber(inst.paidAmount);
    }, 0);

    // Saldo Devedor = Valor Total - Total Já Pago
    const saldoDevedor = toNumber(installment.financialTransaction.amount) - totalPaid;

    // Buscar dados da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        cnpj: true,
        logo: true,
      },
    });

    // Gerar PDF usando PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    const isIncome = installment.financialTransaction.type === 'INCOME';
    const documentTitle = isIncome ? 'RECIBO DE PAGAMENTO' : 'COMPROVANTE DE PAGAMENTO';

    const filename = `${isIncome ? 'recibo' : 'comprovante'}_parcela_${installment.installmentNumber}_${installment.financialTransaction.id.substring(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // ==================== HEADER MODERNO ====================
    pdfStyles.addHeader(
      doc,
      documentTitle,
      `Parcela ${installment.installmentNumber}/${installment.financialTransaction.installmentCount} - Nº ${installment.id.substring(0, 8).toUpperCase()}`,
      company?.name
    );

    // ==================== DADOS DA EMPRESA ====================
    if (company) {
      doc.fontSize(pdfStyles.fonts.small).fillColor(pdfStyles.colors.gray);
      const companyInfo = [];
      if (company.cnpj) companyInfo.push(`CNPJ: ${company.cnpj}`);
      if (company.address) companyInfo.push(company.address);
      if (company.city) companyInfo.push(company.city);
      if (company.state) companyInfo.push(company.state);
      if (company.phone) companyInfo.push(`Tel: ${company.phone}`);
      if (company.email) companyInfo.push(company.email);
      doc.text(companyInfo.join(' | '), { align: 'center' });
      doc.fillColor(pdfStyles.colors.black);
      doc.moveDown(1.5);
    }

    // ==================== DADOS DO CLIENTE ====================
    pdfStyles.addSection(doc, 'Dados do Cliente');
    pdfStyles.addKeyValue(doc, 'Nome', installment.financialTransaction.client.name);
    if (installment.financialTransaction.client.cpf) {
      pdfStyles.addKeyValue(doc, 'CPF/CNPJ', installment.financialTransaction.client.cpf);
    }
    if (installment.financialTransaction.client.email) {
      pdfStyles.addKeyValue(doc, 'E-mail', installment.financialTransaction.client.email);
    }
    if (installment.financialTransaction.client.phone) {
      pdfStyles.addKeyValue(doc, 'Telefone', installment.financialTransaction.client.phone);
    }
    doc.moveDown(1);

    // ==================== REFERÊNCIA DO SERVIÇO ====================
    pdfStyles.addSection(doc, 'Referência');
    pdfStyles.addKeyValue(doc, 'Descrição', installment.financialTransaction.description);
    if (installment.financialTransaction.case) {
      pdfStyles.addKeyValue(doc, 'Processo', installment.financialTransaction.case.processNumber);
      if (installment.financialTransaction.case.subject) {
        pdfStyles.addKeyValue(doc, 'Assunto', installment.financialTransaction.case.subject);
      }
      if (installment.financialTransaction.case.court) {
        pdfStyles.addKeyValue(doc, 'Tribunal', installment.financialTransaction.case.court);
      }
    }
    doc.moveDown(1);

    // ==================== INFORMAÇÕES DA PARCELA ====================
    pdfStyles.addSection(doc, 'Detalhes da Parcela');
    pdfStyles.addKeyValue(doc, 'Parcela', `${installment.installmentNumber} de ${installment.financialTransaction.installmentCount}`);
    pdfStyles.addKeyValue(doc, 'Valor da Parcela', pdfStyles.formatCurrency(toNumber(installment.amount)));
    pdfStyles.addKeyValue(doc, 'Data de Vencimento', pdfStyles.formatDate(installment.dueDate));

    // Status da parcela
    let statusText = '';
    if (installment.status === 'CANCELLED') {
      statusText = 'Cancelado';
    } else if (installment.paidAmount && toNumber(installment.paidAmount) >= toNumber(installment.amount)) {
      statusText = 'Pago';
    } else if (installment.paidAmount && toNumber(installment.paidAmount) > 0) {
      statusText = 'Pago Parcialmente';
    } else {
      const statusLabels: Record<string, string> = {
        PENDING: 'Pendente',
        PAID: 'Pago',
        OVERDUE: 'Atrasado',
        CANCELLED: 'Cancelado',
      };
      statusText = statusLabels[installment.status] || 'Pendente';
    }
    pdfStyles.addKeyValue(doc, 'Status', statusText);

    if (installment.paidDate) {
      pdfStyles.addKeyValue(doc, 'Data de Pagamento', pdfStyles.formatDate(installment.paidDate));
    }

    if (installment.paidAmount) {
      pdfStyles.addKeyValue(doc, 'Valor Pago nesta Parcela', pdfStyles.formatCurrency(toNumber(installment.paidAmount)));
    }

    if (installment.notes) {
      pdfStyles.addKeyValue(doc, 'Observações', installment.notes);
    }
    doc.moveDown(1);

    // ==================== RESUMO FINANCEIRO ====================
    pdfStyles.addSection(doc, 'Resumo Financeiro do Contrato');
    pdfStyles.addKeyValue(doc, 'Valor Total do Contrato', pdfStyles.formatCurrency(toNumber(installment.financialTransaction.amount)));
    doc.fillColor(pdfStyles.colors.success);
    pdfStyles.addKeyValue(doc, 'Total Já Pago', pdfStyles.formatCurrency(totalPaid));
    doc.fillColor(saldoDevedor > 0 ? pdfStyles.colors.danger : pdfStyles.colors.success);
    pdfStyles.addKeyValue(doc, 'Saldo Devedor', pdfStyles.formatCurrency(saldoDevedor));
    doc.fillColor(pdfStyles.colors.black);
    doc.moveDown(1);

    // ==================== HISTÓRICO DE PARCELAS ====================
    pdfStyles.addSection(doc, 'Status das Parcelas');

    const headers = ['Parcela', 'Valor', 'Vencimento', 'Status', 'Pago'];
    const rows = allInstallments.map(inst => {
      const instStatus = inst.paidAmount && toNumber(inst.paidAmount) >= toNumber(inst.amount) ? 'Pago' :
                         inst.paidAmount && toNumber(inst.paidAmount) > 0 ? 'Parcial' : 'Pendente';
      const highlight = inst.id === installment.id ? ' ←' : '';
      return [
        `${inst.installmentNumber}ª${highlight}`,
        pdfStyles.formatCurrency(toNumber(inst.amount)),
        pdfStyles.formatDate(inst.dueDate),
        instStatus,
        inst.paidAmount ? pdfStyles.formatCurrency(toNumber(inst.paidAmount)) : '-',
      ];
    });
    pdfStyles.addTable(doc, headers, rows, [70, 100, 100, 80, 100]);

    doc.moveDown(1);

    // ==================== LINHA DE ASSINATURA ====================
    pdfStyles.addDivider(doc);
    doc.moveDown(1);

    // Área de assinatura
    doc.fontSize(pdfStyles.fonts.body).fillColor(pdfStyles.colors.gray);
    const signatureY = doc.y;

    doc.text('_________________________________', 100, signatureY);
    doc.text(isIncome ? 'Assinatura do Pagador' : 'Assinatura do Beneficiário', 100, signatureY + 15);

    doc.text('_________________________________', 350, signatureY);
    doc.text(isIncome ? 'Assinatura do Recebedor' : 'Assinatura do Responsável', 350, signatureY + 15);
    doc.fillColor(pdfStyles.colors.black);

    // ==================== RODAPÉ ====================
    doc.moveDown(4);
    doc.fontSize(pdfStyles.fonts.tiny).fillColor(pdfStyles.colors.gray);
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.text('Este documento é válido como comprovante de pagamento de parcela.', { align: 'center' });
    doc.fillColor(pdfStyles.colors.black);

    doc.end();
  } catch (error) {
    appLogger.error('Erro ao gerar recibo', error as Error);
    res.status(500).json({ error: 'Erro ao gerar recibo da parcela' });
  }
};
