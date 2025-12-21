import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { parse } from 'csv-parse/sync';
import { Decimal } from '@prisma/client/runtime/library';

// Helper para converter Prisma Decimal para number (necessário após migração Float → Decimal)
const toNumber = (value: Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
};

// Listar transações financeiras com filtros e paginação
export const listTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type, page = 1, limit = 50 } = req.query;
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
    console.error('Erro ao listar transações:', error);
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
    console.error('Erro ao buscar transação:', error);
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
    console.error('Erro ao criar transação:', error);
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
    console.error('Erro ao atualizar transação:', error);
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
    console.error('Erro ao excluir transação:', error);
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
      if (endDate) where.date.lte = new Date(String(endDate));
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
    console.error('Erro ao buscar resumo financeiro:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
  }
};

// Exportar transações para PDF
export const exportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
        { client: { cpf: { contains: String(search), mode: 'insensitive' } } },
      ];
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
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_financeiro.pdf');

    doc.pipe(res);

    // Header com dados da empresa
    if (company) {
      doc.fontSize(16).text(company.name, { align: 'center', bold: true });
      doc.moveDown(0.3);
      doc.fontSize(9);

      if (company.address || company.city || company.state) {
        const addressParts = [];
        if (company.address) addressParts.push(company.address);
        if (company.city) addressParts.push(company.city);
        if (company.state) addressParts.push(company.state);
        if (company.zipCode) addressParts.push(`CEP: ${company.zipCode}`);
        doc.text(addressParts.join(' - '), { align: 'center' });
      }

      const contactParts = [];
      if (company.phone) contactParts.push(`Tel: ${company.phone}`);
      if (company.email) contactParts.push(company.email);
      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), { align: 'center' });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
    }

    // Título do relatório
    doc.fontSize(20).text('Relatório Financeiro', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Resumo:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Total de Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Total de Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo: R$ ${balance.toFixed(2)}`);
    doc.moveDown(2);

    // Transactions table
    doc.fontSize(14).text('Transações:', { underline: true });
    doc.moveDown(1);

    transactions.forEach((transaction, index) => {
      doc.fontSize(10);
      const date = new Date(transaction.date).toLocaleDateString('pt-BR');
      const type = transaction.type === 'INCOME' ? 'Receita' : 'Despesa';
      const amount = `R$ ${transaction.amount.toFixed(2)}`;
      const processNum = transaction.case?.processNumber || '-';

      doc.text(`${index + 1}. ${date} | ${type}`, { continued: false });
      doc.text(`   Cliente: ${transaction.client.name}${transaction.client.cpf ? ` (${transaction.client.cpf})` : ''}`);
      doc.text(`   Descrição: ${transaction.description}`);
      doc.text(`   Processo: ${processNum}`);
      doc.text(`   Valor: ${amount}`, { align: 'right' });
      doc.moveDown(0.5);

      if ((index + 1) % 10 === 0 && index !== transactions.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
};

// Exportar transações para CSV
export const exportCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { search, clientId, caseId, type } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { client: { name: { contains: String(search), mode: 'insensitive' } } },
        { client: { cpf: { contains: String(search), mode: 'insensitive' } } },
      ];
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
    console.error('Erro ao gerar CSV:', error);
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
          error: error.message || 'Erro ao processar linha',
        });
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error('Erro ao importar CSV:', error);
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
    console.error('Erro ao listar parcelas:', error);
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
    console.error('Erro ao atualizar parcela:', error);
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

    // ==================== HEADER DA EMPRESA ====================
    if (company) {
      doc.fontSize(18).font('Helvetica-Bold').text(company.name, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      if (company.cnpj) {
        doc.text(`CNPJ: ${company.cnpj}`, { align: 'center' });
      }

      if (company.address || company.city || company.state) {
        const addressParts = [];
        if (company.address) addressParts.push(company.address);
        if (company.city) addressParts.push(company.city);
        if (company.state) addressParts.push(company.state);
        if (company.zipCode) addressParts.push(`CEP: ${company.zipCode}`);
        doc.text(addressParts.join(' - '), { align: 'center' });
      }

      const contactParts = [];
      if (company.phone) contactParts.push(`Tel: ${company.phone}`);
      if (company.email) contactParts.push(company.email);
      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), { align: 'center' });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
    }

    // ==================== TÍTULO DO DOCUMENTO ====================
    doc.fontSize(22).font('Helvetica-Bold').text(documentTitle, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`(${documentSubtitle})`, { align: 'center' });
    doc.moveDown(0.5);

    // Número do documento
    const documentNumber = `Nº ${transaction.id.substring(0, 8).toUpperCase()}`;
    doc.fontSize(10).text(documentNumber, { align: 'center' });
    doc.moveDown(2);

    // ==================== DADOS DO CLIENTE ====================
    doc.fontSize(14).font('Helvetica-Bold').text('DADOS DO CLIENTE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    doc.text(`Nome: ${transaction.client.name}`);
    if (transaction.client.cpf) {
      doc.text(`CPF/CNPJ: ${transaction.client.cpf}`);
    }
    if (transaction.client.email) {
      doc.text(`E-mail: ${transaction.client.email}`);
    }
    if (transaction.client.phone) {
      doc.text(`Telefone: ${transaction.client.phone}`);
    }
    if (transaction.client.address) {
      doc.text(`Endereço: ${transaction.client.address}`);
    }
    doc.moveDown(1.5);

    // ==================== DADOS DA TRANSAÇÃO ====================
    doc.fontSize(14).font('Helvetica-Bold').text('DETALHES DA TRANSAÇÃO', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    doc.text(`Descrição: ${transaction.description}`);
    doc.text(`Data: ${new Date(transaction.date).toLocaleDateString('pt-BR')}`);

    if (transaction.case) {
      doc.moveDown(0.5);
      doc.text(`Processo Vinculado: ${transaction.case.processNumber}`);
      if (transaction.case.subject) {
        doc.text(`Assunto: ${transaction.case.subject}`);
      }
      if (transaction.case.court) {
        doc.text(`Tribunal: ${transaction.case.court}`);
      }
    }
    doc.moveDown(1.5);

    // ==================== VALORES ====================
    doc.fontSize(14).font('Helvetica-Bold').text('VALORES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    // Verificar se é parcelado
    if (transaction.isInstallment && transaction.installmentCount) {
      doc.text(`Tipo de Pagamento: Parcelado`);
      doc.text(`Número de Parcelas: ${transaction.installmentCount}x`);
      if (transaction.installmentInterval) {
        doc.text(`Intervalo entre Parcelas: ${transaction.installmentInterval} dias`);
      }
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Valor Total: R$ ${toNumber(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.text(`Valor por Parcela: R$ ${(toNumber(transaction.amount) / (transaction.installmentCount || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.moveDown(0.5);
      doc.text(`Total Pago: R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      doc.text(`Valor Devido: R$ ${valorDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

      // Tabela de parcelas
      if (transaction.installments.length > 0) {
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('DETALHAMENTO DAS PARCELAS:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        for (const inst of transaction.installments) {
          const statusLabels: Record<string, string> = {
            PENDING: 'Pendente',
            PAID: 'Pago',
            OVERDUE: 'Atrasado',
            CANCELLED: 'Cancelado',
          };
          const status = inst.paidAmount && toNumber(inst.paidAmount) >= toNumber(inst.amount) ? 'Pago' : statusLabels[inst.status] || 'Pendente';
          const dueDate = new Date(inst.dueDate).toLocaleDateString('pt-BR');
          const paidInfo = inst.paidAmount ? ` (Pago: R$ ${toNumber(inst.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : '';

          doc.text(`  ${inst.installmentNumber}ª Parcela - R$ ${toNumber(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Venc: ${dueDate} - ${status}${paidInfo}`);
        }
      }
    } else {
      doc.text(`Tipo de Pagamento: À Vista`);
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text(`Valor Total: R$ ${toNumber(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

    doc.moveDown(2);

    // ==================== LINHA DE ASSINATURA ====================
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // Área de assinatura
    doc.fontSize(10).font('Helvetica');
    const signatureY = doc.y;

    // Assinatura do recebedor/pagador
    doc.text('_________________________________', 100, signatureY);
    doc.text(isIncome ? 'Assinatura do Pagador' : 'Assinatura do Beneficiário', 100, signatureY + 15);

    doc.text('_________________________________', 350, signatureY);
    doc.text(isIncome ? 'Assinatura do Recebedor' : 'Assinatura do Responsável', 350, signatureY + 15);

    // ==================== RODAPÉ ====================
    doc.moveDown(4);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' });
    doc.text('Este documento é válido como comprovante de transação.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
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

    // ==================== HEADER DA EMPRESA ====================
    if (company) {
      doc.fontSize(18).font('Helvetica-Bold').text(company.name, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      if (company.cnpj) {
        doc.text(`CNPJ: ${company.cnpj}`, { align: 'center' });
      }

      if (company.address || company.city || company.state) {
        const addressParts = [];
        if (company.address) addressParts.push(company.address);
        if (company.city) addressParts.push(company.city);
        if (company.state) addressParts.push(company.state);
        if (company.zipCode) addressParts.push(`CEP: ${company.zipCode}`);
        doc.text(addressParts.join(' - '), { align: 'center' });
      }

      const contactParts = [];
      if (company.phone) contactParts.push(`Tel: ${company.phone}`);
      if (company.email) contactParts.push(company.email);
      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), { align: 'center' });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
    }

    // ==================== TÍTULO DO DOCUMENTO ====================
    doc.fontSize(22).font('Helvetica-Bold').text(documentTitle, { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(`Parcela ${installment.installmentNumber}/${installment.financialTransaction.installmentCount}`, { align: 'center' });
    doc.moveDown(0.5);

    // Número do documento
    const documentNumber = `Nº ${installment.id.substring(0, 8).toUpperCase()}`;
    doc.fontSize(10).text(documentNumber, { align: 'center' });
    doc.moveDown(2);

    // ==================== DADOS DO CLIENTE ====================
    doc.fontSize(14).font('Helvetica-Bold').text('DADOS DO CLIENTE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    doc.text(`Nome: ${installment.financialTransaction.client.name}`);
    if (installment.financialTransaction.client.cpf) {
      doc.text(`CPF/CNPJ: ${installment.financialTransaction.client.cpf}`);
    }
    if (installment.financialTransaction.client.email) {
      doc.text(`E-mail: ${installment.financialTransaction.client.email}`);
    }
    if (installment.financialTransaction.client.phone) {
      doc.text(`Telefone: ${installment.financialTransaction.client.phone}`);
    }
    doc.moveDown(1.5);

    // ==================== REFERÊNCIA DO SERVIÇO ====================
    doc.fontSize(14).font('Helvetica-Bold').text('REFERÊNCIA', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    doc.text(`Descrição: ${installment.financialTransaction.description}`);
    if (installment.financialTransaction.case) {
      doc.text(`Processo: ${installment.financialTransaction.case.processNumber}`);
      if (installment.financialTransaction.case.subject) {
        doc.text(`Assunto: ${installment.financialTransaction.case.subject}`);
      }
      if (installment.financialTransaction.case.court) {
        doc.text(`Tribunal: ${installment.financialTransaction.case.court}`);
      }
    }
    doc.moveDown(1.5);

    // ==================== INFORMAÇÕES DA PARCELA ====================
    doc.fontSize(14).font('Helvetica-Bold').text('DETALHES DA PARCELA', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    const dueDate = new Date(installment.dueDate).toLocaleDateString('pt-BR');
    doc.text(`Parcela: ${installment.installmentNumber} de ${installment.financialTransaction.installmentCount}`);
    doc.text(`Valor da Parcela: R$ ${toNumber(installment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    doc.text(`Data de Vencimento: ${dueDate}`);

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
    doc.text(`Status: ${statusText}`);

    if (installment.paidDate) {
      const paidDate = new Date(installment.paidDate).toLocaleDateString('pt-BR');
      doc.text(`Data de Pagamento: ${paidDate}`);
    }

    if (installment.paidAmount) {
      doc.text(`Valor Pago nesta Parcela: R$ ${toNumber(installment.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

    if (installment.notes) {
      doc.text(`Observações: ${installment.notes}`);
    }
    doc.moveDown(1.5);

    // ==================== RESUMO FINANCEIRO ====================
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('RESUMO FINANCEIRO DO CONTRATO', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    doc.text(`Valor Total do Contrato: R$ ${toNumber(installment.financialTransaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    doc.font('Helvetica-Bold').text(`Total Já Pago: R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    doc.font('Helvetica-Bold').fillColor(saldoDevedor > 0 ? 'red' : 'green').text(`Saldo Devedor: R$ ${saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    doc.fillColor('black');

    // ==================== HISTÓRICO DE PARCELAS ====================
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('STATUS DAS PARCELAS:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    for (const inst of allInstallments) {
      const instStatus = inst.paidAmount && toNumber(inst.paidAmount) >= toNumber(inst.amount) ? '✓ Pago' :
                         inst.paidAmount && toNumber(inst.paidAmount) > 0 ? '◐ Parcial' : '○ Pendente';
      const instDueDate = new Date(inst.dueDate).toLocaleDateString('pt-BR');
      const paidInfo = inst.paidAmount ? ` (R$ ${toNumber(inst.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : '';
      const isCurrent = inst.id === installment.id ? ' ← ESTA PARCELA' : '';

      doc.text(`  ${inst.installmentNumber}ª - R$ ${toNumber(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Venc: ${instDueDate} - ${instStatus}${paidInfo}${isCurrent}`);
    }

    doc.moveDown(2);

    // ==================== LINHA DE ASSINATURA ====================
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // Área de assinatura
    doc.fontSize(10).font('Helvetica');
    const signatureY = doc.y;

    doc.text('_________________________________', 100, signatureY);
    doc.text(isIncome ? 'Assinatura do Pagador' : 'Assinatura do Beneficiário', 100, signatureY + 15);

    doc.text('_________________________________', 350, signatureY);
    doc.text(isIncome ? 'Assinatura do Recebedor' : 'Assinatura do Responsável', 350, signatureY + 15);

    // ==================== RODAPÉ ====================
    doc.moveDown(4);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' });
    doc.text('Este documento é válido como comprovante de pagamento de parcela.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
    res.status(500).json({ error: 'Erro ao gerar recibo da parcela' });
  }
};
