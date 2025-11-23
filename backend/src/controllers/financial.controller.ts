import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { parse } from 'csv-parse/sync';

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

    const totalIncome = incomeTotal._sum.amount || 0;
    const totalExpense = expenseTotal._sum.amount || 0;
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
    const { clientId, caseId, type, description, amount, date } = req.body;
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

    const totalIncome = incomeTotal._sum.amount || 0;
    const totalExpense = expenseTotal._sum.amount || 0;
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

    const totalIncome = incomeTotal._sum.amount || 0;
    const totalExpense = expenseTotal._sum.amount || 0;
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
