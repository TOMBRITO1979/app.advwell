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

        const importEmail = record.Email?.trim()?.toLowerCase();
        if (importEmail) {
          const existingWithEmail = await prisma.client.findFirst({
            where: { companyId, email: importEmail, active: true },
          });
          if (existingWithEmail) {
            errors.push({ line: lineNumber, identifier: record.Nome, error: `Email ja existe: ${existingWithEmail.name}` });
            errorCount++;
            continue;
          }
        }

        // Validar CPF/CNPJ duplicado
        const importCpf = record['CPF/CNPJ']?.trim() || record.CPF?.trim();
        if (importCpf) {
          const existingWithCpf = await prisma.client.findFirst({
            where: { companyId, cpf: importCpf, active: true },
          });
          if (existingWithCpf) {
            errors.push({ line: lineNumber, identifier: record.Nome, error: `CPF/CNPJ ja existe: ${existingWithCpf.name}` });
            errorCount++;
            continue;
          }
        }

        // Validar Telefone duplicado
        const importPhone = record.Telefone?.trim();
        if (importPhone) {
          const existingWithPhone = await prisma.client.findFirst({
            where: { companyId, phone: importPhone, active: true },
          });
          if (existingWithPhone) {
            errors.push({ line: lineNumber, identifier: record.Nome, error: `Telefone ja existe: ${existingWithPhone.name}` });
            errorCount++;
            continue;
          }
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

        await prisma.client.create({
          data: {
            companyId,
            personType: record['Tipo']?.trim() === 'JURIDICA' ? 'JURIDICA' : 'FISICA',
            name: record.Nome.trim(),
            cpf: record['CPF/CNPJ']?.trim() || record.CPF?.trim() || null,
            rg: record.RG?.trim() || null,
            email: record.Email?.trim() || null,
            phone: record.Telefone?.trim() || null,
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
          },
        });

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

        if (existingCase) {
          errors.push({ line: lineNumber, identifier: processNumber, error: 'Processo ja cadastrado' });
          errorCount++;
          continue;
        }

        let value = null;
        if (record.Valor) {
          const valueStr = record.Valor.replace(/[R$\s.]/g, '').replace(',', '.');
          value = parseFloat(valueStr);
          if (isNaN(value)) value = null;
        }

        await prisma.case.create({
          data: {
            companyId,
            clientId: client.id,
            processNumber,
            court: record.Tribunal?.trim() || '',
            subject: record.Assunto?.trim() || '',
            value,
            status: record.Status?.trim() || 'ACTIVE',
            notes: record['Observacoes']?.trim() || record['Observações']?.trim() || null,
          },
        });

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

        await prisma.financialTransaction.create({
          data: {
            companyId,
            clientId: client.id,
            caseId,
            type,
            description: sanitizeString(record['Descricao'].trim()) || record['Descricao'].trim(),
            amount,
            date,
          },
        });

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

        await prisma.accountPayable.create({
          data: {
            companyId,
            supplier: sanitizeString(record.Fornecedor.trim()) || record.Fornecedor.trim(),
            description: sanitizeString(record['Descricao'].trim()) || record['Descricao'].trim(),
            amount,
            dueDate,
            category: record.Categoria?.trim() || null,
            notes: record['Observacoes'] ? (sanitizeString(record['Observacoes'].trim()) || record['Observacoes'].trim()) : null,
            createdBy: userId,
            status: 'PENDING',
          },
        });

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

        if (existing) {
          errors.push({ line: lineNumber, identifier: number, error: 'PNJ ja existe' });
          errorCount++;
          continue;
        }

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

        await prisma.pNJ.create({
          data: {
            companyId,
            number: sanitizeString(number.trim()) || number.trim(),
            protocol: protocol ? sanitizeString(protocol.trim()) : null,
            title: sanitizeString(title.trim()) || title.trim(),
            description: description ? sanitizeString(description) : null,
            status: status as any,
            openDate,
            closeDate,
            clientId,
            createdBy: userId,
          },
        });

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
        const phone = record.Telefone?.trim();
        if (!phone) {
          errors.push({ line: lineNumber, identifier: record.Nome, error: 'Telefone e obrigatorio' });
          errorCount++;
          continue;
        }

        // Verificar se já existe lead com mesmo telefone
        const existingWithPhone = await prisma.lead.findFirst({
          where: { companyId, phone },
        });
        if (existingWithPhone) {
          errors.push({ line: lineNumber, identifier: record.Nome, error: `Telefone ja existe: ${existingWithPhone.name}` });
          errorCount++;
          continue;
        }

        // Verificar email duplicado (se fornecido)
        const importEmail = record.Email?.trim()?.toLowerCase();
        if (importEmail) {
          const existingWithEmail = await prisma.lead.findFirst({
            where: { companyId, email: importEmail },
          });
          if (existingWithEmail) {
            errors.push({ line: lineNumber, identifier: record.Nome, error: `Email ja existe: ${existingWithEmail.name}` });
            errorCount++;
            continue;
          }
        }

        // Mapear status e origem
        const statusRaw = (record.Status?.trim() || 'novo').toLowerCase();
        const status = statusMap[statusRaw] || 'NOVO';

        const sourceRaw = (record.Origem?.trim() || 'outros').toLowerCase();
        const source = sourceMap[sourceRaw] || 'OUTROS';

        await prisma.lead.create({
          data: {
            companyId,
            name: sanitizeString(record.Nome.trim()) || record.Nome.trim(),
            phone,
            email: importEmail || null,
            contactReason: record['Motivo do Contato'] ? sanitizeString(record['Motivo do Contato'].trim()) : null,
            status: status as any,
            source: source as any,
            notes: record['Observacoes'] ? sanitizeString(record['Observacoes'].trim()) : (record['Observações'] ? sanitizeString(record['Observações'].trim()) : null),
          },
        });

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
