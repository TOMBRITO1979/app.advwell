import Queue from 'bull';
import { parse } from 'csv-parse/sync';
import prisma from '../utils/prisma';
import { createRedisClient, redis } from '../utils/redis';
import { appLogger } from '../utils/logger';
import { sanitizeString } from '../utils/sanitize';

// ISSUE 1 FIX: Controle de processadores para evitar duplicacao em multiplas replicas
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

// Interface para status do import
interface CsvImportStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ line: number; identifier: string; error: string }>;
  startedAt?: string;
  completedAt?: string;
}

// Configuracao da fila usando createRedisClient (suporta Sentinel)
const csvImportQueue = new Queue('csv-import', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    attempts: 1, // Nao repetir - CSV pode ter sido processado parcialmente
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Helper para atualizar status no Redis
async function updateStatus(jobId: string, status: Partial<CsvImportStatus>): Promise<void> {
  const key = `csv-import:${jobId}:status`;
  const current = await redis.get(key);
  const parsed = current ? JSON.parse(current) : {};
  await redis.setex(key, 86400, JSON.stringify({ ...parsed, ...status })); // TTL 24 horas
}

// Helper para buscar status
export async function getImportStatus(jobId: string): Promise<CsvImportStatus | null> {
  const key = `csv-import:${jobId}:status`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Helper para enfileirar job de import
export async function enqueueCsvImport(
  type: string,
  companyId: string,
  userId: string,
  csvContent: string,
  totalRows: number
): Promise<string> {
  const jobId = `${type}-${companyId}-${Date.now()}`;

  // Salvar CSV no Redis (TTL 1 hora)
  await redis.setex(`csv-import:${jobId}:data`, 3600, csvContent);

  // Inicializar status
  await updateStatus(jobId, {
    status: 'pending',
    progress: 0,
    totalRows,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  });

  // Enfileirar job
  await csvImportQueue.add(
    type,
    {
      jobId,
      companyId,
      userId,
      csvKey: `csv-import:${jobId}:data`,
      totalRows,
    },
    {
      jobId: `${jobId}`,
    }
  );

  appLogger.info('CSV import job enqueued', { jobId, type, companyId, totalRows });

  return jobId;
}

// ============================================================================
// PROCESSADORES
// ============================================================================

if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Registering CSV import queue processors...');

  // Processador de clientes
  csvImportQueue.process('import-clients', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado ou nao encontrado' }] });
      return { success: false, error: 'CSV expired' };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        if (!record.Nome || record.Nome.trim() === '') {
          errors.push({ line: lineNumber, identifier: record.Nome || '(vazio)', error: 'Nome e obrigatorio' });
          errorCount++;
          continue;
        }

        const importEmail = record.Email?.trim()?.toLowerCase() || null;
        const importCpf = record['CPF/CNPJ']?.trim() || record.CPF?.trim() || null;
        const importPhone = record.Telefone?.trim() || record['Telefone 1']?.trim() || record.Tel?.trim() || record.Celular?.trim() || null;

        // Buscar cliente existente por CPF, Email ou Nome
        let existingClient = null;
        if (importCpf) {
          existingClient = await prisma.client.findFirst({
            where: { companyId, cpf: importCpf, active: true },
          });
        }
        if (!existingClient && importEmail) {
          existingClient = await prisma.client.findFirst({
            where: { companyId, email: importEmail, active: true },
          });
        }
        if (!existingClient) {
          // Fallback: buscar por nome exato
          existingClient = await prisma.client.findFirst({
            where: { companyId, name: record.Nome.trim(), active: true },
          });
        }

        let birthDate = null;
        if (record['Data de Nascimento']) {
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

        const clientData = {
          personType: record['Tipo']?.trim() === 'JURIDICA' ? 'JURIDICA' : 'FISICA',
          name: record.Nome.trim(),
          cpf: importCpf,
          rg: record.RG?.trim() || null,
          email: importEmail,
          phone: importPhone,
          address: record['Endereco']?.trim() || null,
          city: record.Cidade?.trim() || null,
          state: record.Estado?.trim() || null,
          zipCode: record.CEP?.trim() || null,
          profession: record['Profissao']?.trim() || null,
          maritalStatus: record['Estado Civil']?.trim() || null,
          birthDate,
          representativeName: record['Representante Legal']?.trim() || null,
          representativeCpf: record['CPF Representante']?.trim() || null,
          notes: record['Observacoes']?.trim() || null,
        };

        if (existingClient) {
          // Atualizar cliente existente (manter valores existentes se novos forem nulos)
          await prisma.client.update({
            where: { id: existingClient.id },
            data: {
              personType: clientData.personType as any,
              name: clientData.name,
              cpf: clientData.cpf || existingClient.cpf,
              rg: clientData.rg || existingClient.rg,
              email: clientData.email || existingClient.email,
              phone: clientData.phone || existingClient.phone,
              address: clientData.address || existingClient.address,
              city: clientData.city || existingClient.city,
              state: clientData.state || existingClient.state,
              zipCode: clientData.zipCode || existingClient.zipCode,
              profession: clientData.profession || existingClient.profession,
              maritalStatus: clientData.maritalStatus || existingClient.maritalStatus,
              birthDate: clientData.birthDate || existingClient.birthDate,
              representativeName: clientData.representativeName || existingClient.representativeName,
              representativeCpf: clientData.representativeCpf || existingClient.representativeCpf,
              notes: clientData.notes || existingClient.notes,
            },
          });
        } else {
          // Criar novo cliente
          await prisma.client.create({
            data: {
              companyId,
              ...clientData,
              personType: clientData.personType as any,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record.Nome || '(vazio)', error: 'Erro ao processar linha' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV client import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de processos/casos
  csvImportQueue.process('import-cases', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado' }] });
      return { success: false };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        // Aceitar com ou sem acento
        const processNumber = (record['Numero do Processo'] || record['Número do Processo'])?.trim();

        if (!processNumber) {
          errors.push({ line: lineNumber, identifier: '(vazio)', error: 'Numero do processo e obrigatorio' });
          errorCount++;
          continue;
        }

        if (!record['CPF Cliente'] && !record['Cliente']) {
          errors.push({ line: lineNumber, identifier: processNumber, error: 'CPF ou Nome do cliente e obrigatorio' });
          errorCount++;
          continue;
        }

        const client = await prisma.client.findFirst({
          where: {
            companyId,
            active: true,
            OR: [
              { cpf: record['CPF Cliente']?.trim() },
              { name: record['Cliente']?.trim() },
            ],
          },
        });

        if (!client) {
          errors.push({ line: lineNumber, identifier: processNumber, error: `Cliente nao encontrado` });
          errorCount++;
          continue;
        }

        const existingCase = await prisma.case.findFirst({
          where: { companyId, processNumber },
        });

        let value = null;
        if (record.Valor) {
          const valueStr = record.Valor.replace(/[R$\s.]/g, '').replace(',', '.');
          value = parseFloat(valueStr);
          if (isNaN(value)) value = null;
        }

        const caseData = {
          clientId: client.id,
          processNumber,
          court: record.Tribunal?.trim() || '',
          subject: record.Assunto?.trim() || '',
          value,
          status: record.Status?.trim() || 'ACTIVE',
          notes: record['Observacoes']?.trim() || record['Observações']?.trim() || null,
        };

        if (existingCase) {
          // Atualizar processo existente
          await prisma.case.update({
            where: { id: existingCase.id },
            data: {
              clientId: caseData.clientId,
              court: caseData.court || existingCase.court,
              subject: caseData.subject || existingCase.subject,
              value: caseData.value ?? existingCase.value,
              status: caseData.status || existingCase.status,
              notes: caseData.notes || existingCase.notes,
            },
          });
        } else {
          // Criar novo processo
          await prisma.case.create({
            data: {
              companyId,
              ...caseData,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: (record['Numero do Processo'] || record['Número do Processo'] || '(vazio)'), error: 'Erro ao processar' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV case import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de transacoes financeiras
  csvImportQueue.process('import-financial', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado' }] });
      return { success: false };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        const tipoValido = record.Tipo?.trim();
        if (!tipoValido || !['Receita', 'Despesa', 'INCOME', 'EXPENSE'].includes(tipoValido)) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Tipo deve ser Receita, Despesa, INCOME ou EXPENSE' });
          errorCount++;
          continue;
        }

        if (!record.Cliente?.trim()) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Cliente e obrigatorio' });
          errorCount++;
          continue;
        }

        if (!record['Descricao']?.trim()) {
          errors.push({ line: lineNumber, identifier: record.Cliente || '(vazio)', error: 'Descricao e obrigatoria' });
          errorCount++;
          continue;
        }

        if (!record.Valor || isNaN(parseFloat(record.Valor.replace(',', '.')))) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Valor invalido' });
          errorCount++;
          continue;
        }

        if (!record.Data) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Data e obrigatoria' });
          errorCount++;
          continue;
        }

        const type = (tipoValido === 'Receita' || tipoValido === 'INCOME') ? 'INCOME' : 'EXPENSE';

        const client = await prisma.client.findFirst({
          where: {
            companyId,
            OR: [
              { name: { contains: record.Cliente.trim(), mode: 'insensitive' } },
              { cpf: record.Cliente.trim() },
            ],
          },
        });

        if (!client) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: `Cliente "${record.Cliente}" nao encontrado` });
          errorCount++;
          continue;
        }

        let caseId = null;
        if (record.Processo?.trim()) {
          const caseFound = await prisma.case.findFirst({
            where: { companyId, processNumber: { contains: record.Processo.trim(), mode: 'insensitive' } },
          });
          if (caseFound) caseId = caseFound.id;
        }

        const amount = parseFloat(record.Valor.replace(',', '.'));

        let date: Date;
        const dateStr = record.Data.trim();
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          date = new Date(`${year}-${month}-${day}`);
        } else {
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Data invalida' });
          errorCount++;
          continue;
        }

        const descriptionNormalized = sanitizeString(record['Descricao'].trim()) || record['Descricao'].trim();

        // Verificar se já existe transação com mesmos dados
        const existingTransaction = await prisma.financialTransaction.findFirst({
          where: {
            companyId,
            clientId: client.id,
            description: descriptionNormalized,
            date,
            amount,
          },
        });

        if (existingTransaction) {
          // Atualizar transação existente
          await prisma.financialTransaction.update({
            where: { id: existingTransaction.id },
            data: {
              type,
              caseId: caseId || existingTransaction.caseId,
            },
          });
        } else {
          // Criar nova transação
          await prisma.financialTransaction.create({
            data: {
              companyId,
              clientId: client.id,
              caseId,
              type,
              description: descriptionNormalized,
              amount,
              date,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record['Descricao'] || '(vazio)', error: 'Erro ao processar' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV financial import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de contas a pagar
  csvImportQueue.process('import-accounts-payable', 1, async (job) => {
    const { jobId, companyId, userId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado' }] });
      return { success: false };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        if (!record.Fornecedor?.trim()) {
          errors.push({ line: lineNumber, identifier: '(vazio)', error: 'Fornecedor e obrigatorio' });
          errorCount++;
          continue;
        }

        if (!record['Descricao']?.trim()) {
          errors.push({ line: lineNumber, identifier: record.Fornecedor, error: 'Descricao e obrigatoria' });
          errorCount++;
          continue;
        }

        if (!record.Valor || isNaN(parseFloat(record.Valor.replace(',', '.')))) {
          errors.push({ line: lineNumber, identifier: record.Fornecedor, error: 'Valor invalido' });
          errorCount++;
          continue;
        }

        if (!record.Vencimento) {
          errors.push({ line: lineNumber, identifier: record.Fornecedor, error: 'Vencimento e obrigatorio' });
          errorCount++;
          continue;
        }

        const amount = parseFloat(record.Valor.replace(',', '.'));

        let dueDate: Date;
        const dateStr = record.Vencimento.trim();
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          dueDate = new Date(`${year}-${month}-${day}`);
        } else {
          dueDate = new Date(dateStr);
        }

        if (isNaN(dueDate.getTime())) {
          errors.push({ line: lineNumber, identifier: record.Fornecedor, error: 'Data de vencimento invalida' });
          errorCount++;
          continue;
        }

        const supplierNormalized = sanitizeString(record.Fornecedor.trim()) || record.Fornecedor.trim();
        const descriptionNormalized = sanitizeString(record['Descricao'].trim()) || record['Descricao'].trim();

        // Verificar se já existe conta com mesmos dados
        const existingAccount = await prisma.accountPayable.findFirst({
          where: {
            companyId,
            supplier: supplierNormalized,
            description: descriptionNormalized,
            dueDate,
          },
        });

        if (existingAccount) {
          // Atualizar conta existente
          await prisma.accountPayable.update({
            where: { id: existingAccount.id },
            data: {
              amount,
              category: record.Categoria?.trim() || existingAccount.category,
              notes: record['Observacoes'] ? (sanitizeString(record['Observacoes'].trim()) || record['Observacoes'].trim()) : existingAccount.notes,
            },
          });
        } else {
          // Criar nova conta
          await prisma.accountPayable.create({
            data: {
              companyId,
              supplier: supplierNormalized,
              description: descriptionNormalized,
              amount,
              dueDate,
              category: record.Categoria?.trim() || null,
              notes: record['Observacoes'] ? (sanitizeString(record['Observacoes'].trim()) || record['Observacoes'].trim()) : null,
              createdBy: userId,
              status: 'PENDING',
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record.Fornecedor || '(vazio)', error: 'Erro ao processar' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV accounts payable import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de PNJs
  csvImportQueue.process('import-pnj', 1, async (job) => {
    const { jobId, companyId, userId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado' }] });
      return { success: false };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter }) as Record<string, string>[];

    const statusMap: Record<string, string> = {
      'ativo': 'ACTIVE',
      'active': 'ACTIVE',
      'arquivado': 'ARCHIVED',
      'archived': 'ARCHIVED',
      'encerrado': 'CLOSED',
      'closed': 'CLOSED',
    };

    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const lineNumber = i + 2;

      try {
        const number = record['Numero'] || record['numero'] || record['Number'];
        const title = record['Titulo'] || record['titulo'] || record['Title'];

        if (!number || !title) {
          errors.push({ line: lineNumber, identifier: number || '(vazio)', error: 'Numero e Titulo sao obrigatorios' });
          errorCount++;
          continue;
        }

        const existing = await prisma.pNJ.findFirst({
          where: { companyId, number: number.trim() },
        });

        const protocol = record['Protocolo'] || record['protocolo'] || record['Protocol'] || null;
        const description = record['Descricao'] || record['descricao'] || record['Description'] || null;
        const statusRaw = (record['Status'] || record['status'] || 'ativo').toLowerCase();
        const status = statusMap[statusRaw] || 'ACTIVE';
        const openDateStr = record['Data Abertura'] || record['data_abertura'] || record['OpenDate'];
        const closeDateStr = record['Data Encerramento'] || record['data_encerramento'] || record['CloseDate'];

        const openDate = parseDate(openDateStr) || new Date();
        const closeDate = parseDate(closeDateStr);

        let clientId: string | null = null;
        const clientName = record['Cliente'] || record['cliente'] || record['Client'];
        if (clientName) {
          const client = await prisma.client.findFirst({
            where: { companyId, name: { contains: clientName.trim(), mode: 'insensitive' } },
          });
          if (client) clientId = client.id;
        }

        const pnjData = {
          number: sanitizeString(number.trim()) || number.trim(),
          protocol: protocol ? sanitizeString(protocol.trim()) : null,
          title: sanitizeString(title.trim()) || title.trim(),
          description: description ? sanitizeString(description) : null,
          status: status as any,
          openDate,
          closeDate,
          clientId,
        };

        if (existing) {
          // Atualizar PNJ existente
          await prisma.pNJ.update({
            where: { id: existing.id },
            data: {
              protocol: pnjData.protocol || existing.protocol,
              title: pnjData.title,
              description: pnjData.description || existing.description,
              status: pnjData.status,
              openDate: pnjData.openDate,
              closeDate: pnjData.closeDate || existing.closeDate,
              clientId: pnjData.clientId || existing.clientId,
            },
          });
        } else {
          // Criar novo PNJ
          await prisma.pNJ.create({
            data: {
              companyId,
              ...pnjData,
              createdBy: userId,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record['Numero'] || '(vazio)', error: 'Erro ao processar' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV PNJ import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de Leads
  csvImportQueue.process('import-leads', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado ou nao encontrado' }] });
      return { success: false, error: 'CSV expired' };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    // Mapas de conversão
    const statusMap: Record<string, string> = {
      'novo': 'NOVO',
      'contatado': 'CONTATADO',
      'qualificado': 'QUALIFICADO',
      'convertido': 'CONVERTIDO',
      'perdido': 'PERDIDO',
    };

    const sourceMap: Record<string, string> = {
      'whatsapp': 'WHATSAPP',
      'telefone': 'TELEFONE',
      'site': 'SITE',
      'indicacao': 'INDICACAO',
      'indicação': 'INDICACAO',
      'redes sociais': 'REDES_SOCIAIS',
      'redes_sociais': 'REDES_SOCIAIS',
      'outros': 'OUTROS',
    };

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        // Nome é obrigatório
        if (!record.Nome || record.Nome.trim() === '') {
          errors.push({ line: lineNumber, identifier: '(vazio)', error: 'Nome e obrigatorio' });
          errorCount++;
          continue;
        }

        // Telefone é obrigatório para leads
        const phone = record.Telefone?.trim() || record['Telefone 1']?.trim() || record.Tel?.trim() || record.Celular?.trim();
        if (!phone) {
          errors.push({ line: lineNumber, identifier: record.Nome, error: 'Telefone e obrigatorio' });
          errorCount++;
          continue;
        }

        const importEmail = record.Email?.trim()?.toLowerCase() || null;

        // Buscar lead existente por telefone ou email
        let existingLead = await prisma.lead.findFirst({
          where: { companyId, phone },
        });
        if (!existingLead && importEmail) {
          existingLead = await prisma.lead.findFirst({
            where: { companyId, email: importEmail },
          });
        }

        // Mapear status e origem
        const statusRaw = (record.Status?.trim() || 'novo').toLowerCase();
        const status = statusMap[statusRaw] || 'NOVO';

        const sourceRaw = (record.Origem?.trim() || 'outros').toLowerCase();
        const source = sourceMap[sourceRaw] || 'OUTROS';

        const leadData = {
          name: sanitizeString(record.Nome.trim()) || record.Nome.trim(),
          phone,
          email: importEmail,
          contactReason: record['Motivo do Contato'] ? sanitizeString(record['Motivo do Contato'].trim()) : null,
          status: status as any,
          source: source as any,
          notes: record['Observacoes'] ? sanitizeString(record['Observacoes'].trim()) : (record['Observações'] ? sanitizeString(record['Observações'].trim()) : null),
        };

        if (existingLead) {
          // Atualizar lead existente
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              name: leadData.name,
              phone: leadData.phone,
              email: leadData.email || existingLead.email,
              contactReason: leadData.contactReason || existingLead.contactReason,
              status: leadData.status,
              source: leadData.source,
              notes: leadData.notes || existingLead.notes,
            },
          });
        } else {
          // Criar novo lead
          await prisma.lead.create({
            data: {
              companyId,
              ...leadData,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record.Nome || '(vazio)', error: 'Erro ao processar linha' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV lead import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de eventos da agenda (Schedule)
  csvImportQueue.process('import-schedule', 1, async (job) => {
    const { jobId, companyId, userId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado ou nao encontrado' }] });
      return { success: false, error: 'CSV expired' };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    // Mapeamento de tipos
    const typeMap: Record<string, string> = {
      'compromisso': 'COMPROMISSO',
      'tarefa': 'TAREFA',
      'prazo': 'PRAZO',
      'audiencia': 'AUDIENCIA',
      'audiência': 'AUDIENCIA',
      'pericia': 'PERICIA',
      'perícia': 'PERICIA',
      'google meet': 'GOOGLE_MEET',
      'googlemeet': 'GOOGLE_MEET',
    };

    // Mapeamento de prioridades
    const priorityMap: Record<string, string> = {
      'baixa': 'BAIXA',
      'media': 'MEDIA',
      'média': 'MEDIA',
      'alta': 'ALTA',
      'urgente': 'URGENTE',
    };

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        // Suporta formato exportado (10 colunas) ou formato simples
        // Colunas exportadas: Data, Horário, Título, Tipo, Prioridade, Cliente, Processo, Responsável, Status, Descrição
        const dateStr = record['Data']?.trim();
        const timeStr = record['Horário'] || record['Horario'] || '';
        const title = record['Título'] || record['Titulo'] || '';
        const typeStr = record['Tipo']?.trim() || 'compromisso';
        const priorityStr = record['Prioridade']?.trim() || 'media';
        const description = record['Descrição'] || record['Descricao'] || '';

        if (!dateStr) {
          errors.push({ line: lineNumber, identifier: title || '(vazio)', error: 'Data e obrigatoria' });
          errorCount++;
          continue;
        }

        if (!title) {
          errors.push({ line: lineNumber, identifier: dateStr, error: 'Titulo e obrigatorio' });
          errorCount++;
          continue;
        }

        // Parse date (DD/MM/YYYY or YYYY-MM-DD)
        let eventDate: Date;
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          eventDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else {
          eventDate = new Date(dateStr);
        }

        if (isNaN(eventDate.getTime())) {
          errors.push({ line: lineNumber, identifier: title, error: `Data invalida: ${dateStr}` });
          errorCount++;
          continue;
        }

        // Parse time (HH:MM)
        if (timeStr) {
          const timeParts = timeStr.trim().split(':');
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            if (!isNaN(hours) && !isNaN(minutes)) {
              eventDate.setHours(hours, minutes, 0, 0);
            }
          }
        }

        // Map type and priority
        const type = typeMap[typeStr.toLowerCase()] || 'COMPROMISSO';
        const priority = priorityMap[priorityStr.toLowerCase()] || 'MEDIA';

        const titleNormalized = sanitizeString(title.trim()) || title.trim();

        // Verificar se já existe evento com mesmo título e data
        const existingEvent = await prisma.scheduleEvent.findFirst({
          where: {
            companyId,
            title: titleNormalized,
            date: eventDate,
          },
        });

        if (existingEvent) {
          // Atualizar evento existente
          await prisma.scheduleEvent.update({
            where: { id: existingEvent.id },
            data: {
              description: description ? (sanitizeString(description.trim()) || description.trim()) : existingEvent.description,
              type: type as any,
              priority: priority as any,
            },
          });
        } else {
          // Criar novo evento
          await prisma.scheduleEvent.create({
            data: {
              companyId,
              title: titleNormalized,
              description: description ? (sanitizeString(description.trim()) || description.trim()) : null,
              type: type as any,
              priority: priority as any,
              date: eventDate,
              createdBy: userId,
            },
          });
        }

        successCount++;
      } catch (err) {
        const identifier = record['Título'] || record['Titulo'] || '(vazio)';
        errors.push({ line: lineNumber, identifier, error: 'Erro ao processar linha' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV schedule import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de Adversos
  csvImportQueue.process('import-adverse', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado ou nao encontrado' }] });
      return { success: false, error: 'CSV expired' };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        if (!record.Nome || record.Nome.trim() === '') {
          errors.push({ line: lineNumber, identifier: '(vazio)', error: 'Nome e obrigatorio' });
          errorCount++;
          continue;
        }

        const importCpf = record['CPF/CNPJ']?.trim() || record.CPF?.trim() || null;
        const importEmail = record.Email?.trim()?.toLowerCase() || null;
        const importPhone = record.Telefone?.trim() || record['Telefone 1']?.trim() || record.Tel?.trim() || record.Celular?.trim() || null;

        // Buscar adverso existente por CPF ou Nome
        let existingAdverse = null;
        if (importCpf) {
          existingAdverse = await prisma.adverse.findFirst({
            where: { companyId, cpf: importCpf, active: true },
          });
        }
        if (!existingAdverse) {
          // Fallback: buscar por nome exato
          existingAdverse = await prisma.adverse.findFirst({
            where: { companyId, name: record.Nome.trim(), active: true },
          });
        }

        // Parse date
        let birthDate = null;
        const dateStr = record['Data de Nascimento']?.trim();
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

        const adverseData = {
          personType: record['Tipo Pessoa']?.trim() === 'JURIDICA' ? 'JURIDICA' : 'FISICA',
          name: record.Nome.trim(),
          cpf: importCpf,
          rg: record.RG?.trim() || null,
          pis: record.PIS?.trim() || null,
          ctps: record.CTPS?.trim() || null,
          ctpsSerie: record['CTPS Série']?.trim() || record['CTPS Serie']?.trim() || null,
          motherName: record['Nome da Mãe']?.trim() || record['Nome da Mae']?.trim() || null,
          email: importEmail,
          phone: importPhone,
          phone2: record['Telefone 2']?.trim() || null,
          instagram: record.Instagram?.trim() || null,
          facebook: record.Facebook?.trim() || null,
          customField1: record['Campo Personalizado 1']?.trim() || null,
          customField2: record['Campo Personalizado 2']?.trim() || null,
          address: record['Endereço']?.trim() || record.Endereco?.trim() || null,
          neighborhood: record.Bairro?.trim() || null,
          city: record.Cidade?.trim() || null,
          state: record.Estado?.trim() || null,
          zipCode: record.CEP?.trim() || null,
          profession: record['Profissão']?.trim() || record.Profissao?.trim() || null,
          nationality: record.Nacionalidade?.trim() || null,
          maritalStatus: record['Estado Civil']?.trim() || null,
          birthDate,
          representativeName: record['Nome do Representante']?.trim() || null,
          representativeCpf: record['CPF do Representante']?.trim() || null,
          notes: record['Observações']?.trim() || record.Observacoes?.trim() || null,
        };

        if (existingAdverse) {
          // Atualizar adverso existente (manter valores existentes se novos forem nulos)
          await prisma.adverse.update({
            where: { id: existingAdverse.id },
            data: {
              personType: adverseData.personType as any,
              name: adverseData.name,
              cpf: adverseData.cpf || existingAdverse.cpf,
              rg: adverseData.rg || existingAdverse.rg,
              pis: adverseData.pis || existingAdverse.pis,
              ctps: adverseData.ctps || existingAdverse.ctps,
              ctpsSerie: adverseData.ctpsSerie || existingAdverse.ctpsSerie,
              motherName: adverseData.motherName || existingAdverse.motherName,
              email: adverseData.email || existingAdverse.email,
              phone: adverseData.phone || existingAdverse.phone,
              phone2: adverseData.phone2 || existingAdverse.phone2,
              instagram: adverseData.instagram || existingAdverse.instagram,
              facebook: adverseData.facebook || existingAdverse.facebook,
              customField1: adverseData.customField1 || existingAdverse.customField1,
              customField2: adverseData.customField2 || existingAdverse.customField2,
              address: adverseData.address || existingAdverse.address,
              neighborhood: adverseData.neighborhood || existingAdverse.neighborhood,
              city: adverseData.city || existingAdverse.city,
              state: adverseData.state || existingAdverse.state,
              zipCode: adverseData.zipCode || existingAdverse.zipCode,
              profession: adverseData.profession || existingAdverse.profession,
              nationality: adverseData.nationality || existingAdverse.nationality,
              maritalStatus: adverseData.maritalStatus || existingAdverse.maritalStatus,
              birthDate: adverseData.birthDate || existingAdverse.birthDate,
              representativeName: adverseData.representativeName || existingAdverse.representativeName,
              representativeCpf: adverseData.representativeCpf || existingAdverse.representativeCpf,
              notes: adverseData.notes || existingAdverse.notes,
            },
          });
        } else {
          // Criar novo adverso
          await prisma.adverse.create({
            data: {
              companyId,
              ...adverseData,
              personType: adverseData.personType as any,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record.Nome || '(vazio)', error: 'Erro ao processar linha' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV adverse import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Processador de Advogados
  csvImportQueue.process('import-lawyer', 1, async (job) => {
    const { jobId, companyId, csvKey, totalRows } = job.data;

    await updateStatus(jobId, { status: 'processing', startedAt: new Date().toISOString() });

    const csvContent = await redis.get(csvKey);
    if (!csvContent) {
      await updateStatus(jobId, { status: 'failed', errors: [{ line: 0, identifier: '', error: 'CSV expirado ou nao encontrado' }] });
      return { success: false, error: 'CSV expired' };
    }

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true, delimiter });

    // Mapeamentos de tipo e vínculo
    const lawyerTypeMap: Record<string, string> = {
      'socio': 'SOCIO',
      'sócio': 'SOCIO',
      'associado': 'ASSOCIADO',
      'correspondente': 'CORRESPONDENTE',
      'estagiario': 'ESTAGIARIO',
      'estagiário': 'ESTAGIARIO',
    };

    const affiliationMap: Record<string, string> = {
      'escritorio': 'ESCRITORIO',
      'escritório': 'ESCRITORIO',
      'externo': 'EXTERNO',
    };

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ line: number; identifier: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i] as any;
      const lineNumber = i + 2;

      try {
        if (!record.Nome || record.Nome.trim() === '') {
          errors.push({ line: lineNumber, identifier: '(vazio)', error: 'Nome e obrigatorio' });
          errorCount++;
          continue;
        }

        const importOab = record.OAB?.trim() || null;
        const importCpf = record.CPF?.trim() || null;
        const importEmail = record.Email?.trim()?.toLowerCase() || null;
        const importPhone = record.Telefone?.trim() || record['Telefone 1']?.trim() || record.Tel?.trim() || record.Celular?.trim() || null;

        // Buscar advogado existente por OAB, CPF ou Nome
        let existingLawyer = null;
        if (importOab) {
          existingLawyer = await prisma.lawyer.findFirst({
            where: { companyId, oab: importOab, active: true },
          });
        }
        if (!existingLawyer && importCpf) {
          existingLawyer = await prisma.lawyer.findFirst({
            where: { companyId, cpf: importCpf, active: true },
          });
        }
        if (!existingLawyer) {
          // Fallback: buscar por nome exato
          existingLawyer = await prisma.lawyer.findFirst({
            where: { companyId, name: record.Nome.trim(), active: true },
          });
        }

        // Mapear tipo e vínculo
        const typeRaw = (record.Tipo?.trim() || 'associado').toLowerCase();
        const lawyerType = lawyerTypeMap[typeRaw] || 'ASSOCIADO';

        const affiliationRaw = (record['Vínculo']?.trim() || record.Vinculo?.trim() || 'escritorio').toLowerCase();
        const affiliation = affiliationMap[affiliationRaw] || 'ESCRITORIO';

        const lawyerData = {
          name: record.Nome.trim(),
          cpf: importCpf,
          oab: importOab,
          oabState: record['UF OAB']?.trim() || null,
          lawyerType: lawyerType as any,
          affiliation: affiliation as any,
          team: record.Equipe?.trim() || null,
          email: importEmail,
          phone: importPhone,
          phone2: record['Telefone 2']?.trim() || null,
          instagram: record.Instagram?.trim() || null,
          facebook: record.Facebook?.trim() || null,
          customField1: record['Campo Personalizado 1']?.trim() || null,
          customField2: record['Campo Personalizado 2']?.trim() || null,
          address: record['Endereço']?.trim() || record.Endereco?.trim() || null,
          neighborhood: record.Bairro?.trim() || null,
          city: record.Cidade?.trim() || null,
          state: record.Estado?.trim() || null,
          zipCode: record.CEP?.trim() || null,
          notes: record['Observações']?.trim() || record.Observacoes?.trim() || null,
        };

        if (existingLawyer) {
          // Atualizar advogado existente (manter valores existentes se novos forem nulos)
          await prisma.lawyer.update({
            where: { id: existingLawyer.id },
            data: {
              name: lawyerData.name,
              cpf: lawyerData.cpf || existingLawyer.cpf,
              oab: lawyerData.oab || existingLawyer.oab,
              oabState: lawyerData.oabState || existingLawyer.oabState,
              lawyerType: lawyerData.lawyerType,
              affiliation: lawyerData.affiliation,
              team: lawyerData.team || existingLawyer.team,
              email: lawyerData.email || existingLawyer.email,
              phone: lawyerData.phone || existingLawyer.phone,
              phone2: lawyerData.phone2 || existingLawyer.phone2,
              instagram: lawyerData.instagram || existingLawyer.instagram,
              facebook: lawyerData.facebook || existingLawyer.facebook,
              customField1: lawyerData.customField1 || existingLawyer.customField1,
              customField2: lawyerData.customField2 || existingLawyer.customField2,
              address: lawyerData.address || existingLawyer.address,
              neighborhood: lawyerData.neighborhood || existingLawyer.neighborhood,
              city: lawyerData.city || existingLawyer.city,
              state: lawyerData.state || existingLawyer.state,
              zipCode: lawyerData.zipCode || existingLawyer.zipCode,
              notes: lawyerData.notes || existingLawyer.notes,
            },
          });
        } else {
          // Criar novo advogado
          await prisma.lawyer.create({
            data: {
              companyId,
              ...lawyerData,
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push({ line: lineNumber, identifier: record.Nome || '(vazio)', error: 'Erro ao processar linha' });
        errorCount++;
      }

      if (i % 10 === 0 || i === records.length - 1) {
        await updateStatus(jobId, {
          progress: Math.round(((i + 1) / totalRows) * 100),
          processedRows: i + 1,
          successCount,
          errorCount,
        });
      }
    }

    await redis.del(csvKey);

    await updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      processedRows: totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
      completedAt: new Date().toISOString(),
    });

    appLogger.info('CSV lawyer import completed', { jobId, successCount, errorCount });
    return { success: true, successCount, errorCount };
  });

  // Event handlers
  csvImportQueue.on('completed', (job, result) => {
    appLogger.info('CSV import job completed', { jobName: job.name, jobId: job.data.jobId, result });
  });

  csvImportQueue.on('failed', (job, err) => {
    appLogger.error('CSV import job failed', err as Error, { jobName: job.name, jobId: job.data.jobId });
  });

  csvImportQueue.on('stalled', (job) => {
    appLogger.warn('CSV import job stalled', { jobName: job.name, jobId: job.data.jobId });
  });

} else {
  appLogger.info('CSV import queue processors DISABLED (ENABLE_QUEUE_PROCESSORS=false)');
}

// Estatisticas da fila
export const getCsvImportQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    csvImportQueue.getWaitingCount(),
    csvImportQueue.getActiveCount(),
    csvImportQueue.getCompletedCount(),
    csvImportQueue.getFailedCount(),
    csvImportQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

export default csvImportQueue;
