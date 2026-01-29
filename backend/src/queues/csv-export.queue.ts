import Queue from 'bull';
import prisma from '../utils/prisma';
import { createRedisClient, redis } from '../utils/redis';
import { appLogger } from '../utils/logger';
import nodemailer from 'nodemailer';

// Controle de processadores para evitar duplicacao em multiplas replicas
const ENABLE_QUEUE_PROCESSORS = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

// Limite para export sincrono (acima disso vai para fila)
export const SYNC_EXPORT_LIMIT = 10000;

// SMTP config
const SYSTEM_SMTP = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  from: process.env.SMTP_FROM || 'noreply@advwell.pro',
};

// Interface para status do export
interface CsvExportStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  exportType: string;
  fileName?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

// Tipos de export suportados
export type ExportType = 'clients' | 'cases' | 'financial' | 'schedule' | 'leads' | 'accounts-payable';

// Configuracao da fila
const csvExportQueue = new Queue('csv-export', {
  createClient: () => createRedisClient(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

// Helper para atualizar status no Redis
async function updateExportStatus(jobId: string, status: Partial<CsvExportStatus>): Promise<void> {
  const key = `csv-export:${jobId}:status`;
  const current = await redis.get(key);
  const parsed = current ? JSON.parse(current) : {};
  await redis.setex(key, 86400, JSON.stringify({ ...parsed, ...status })); // TTL 24 horas
}

// Helper para buscar status
export async function getExportStatus(jobId: string): Promise<CsvExportStatus | null> {
  const key = `csv-export:${jobId}:status`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Interface para dados do job
interface ExportJobData {
  jobId: string;
  exportType: ExportType;
  companyId: string;
  userId: string;
  userEmail: string;
  filters: Record<string, any>;
  totalRecords: number;
}

// Enfileirar job de export
export async function enqueueExport(
  exportType: ExportType,
  companyId: string,
  userId: string,
  userEmail: string,
  filters: Record<string, any>,
  totalRecords: number
): Promise<string> {
  const jobId = `export-${exportType}-${companyId}-${Date.now()}`;

  // Inicializar status
  await updateExportStatus(jobId, {
    status: 'pending',
    progress: 0,
    totalRecords,
    exportType,
  });

  // Enfileirar job
  await csvExportQueue.add(
    'process-export',
    {
      jobId,
      exportType,
      companyId,
      userId,
      userEmail,
      filters,
      totalRecords,
    } as ExportJobData,
    {
      jobId,
    }
  );

  appLogger.info('CSV export job enqueued', { jobId, exportType, companyId, totalRecords, userEmail });

  return jobId;
}

// ============================================================================
// GERADORES DE CSV
// ============================================================================

async function generateClientsCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId, active: true };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { cpf: { contains: filters.search } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Header com todos os campos (31 colunas) - ordem consistente com import
  const csvHeader = [
    'Tipo',
    'Condição',
    'Nome',
    'CPF/CNPJ',
    'Inscrição Estadual',
    'RG',
    'PIS',
    'CTPS',
    'CTPS Série',
    'Nome da Mãe',
    'Data de Nascimento',
    'Profissão',
    'Nacionalidade',
    'Estado Civil',
    'Email',
    'Telefone',
    'Telefone 2',
    'Instagram',
    'Facebook',
    'Endereço',
    'Bairro',
    'Cidade',
    'Estado',
    'CEP',
    'Representante Legal',
    'CPF Representante',
    'Campo Personalizado 1',
    'Campo Personalizado 2',
    'Tags',
    'Observações',
    'Data Cadastro',
  ].join(',') + '\n';

  const csvRows = clients.map(client => {
    return [
      `"${client.personType || 'FISICA'}"`,
      `"${client.clientCondition || ''}"`,
      `"${(client.name || '').replace(/"/g, '""')}"`,
      `"${client.cpf || ''}"`,
      `"${client.stateRegistration || ''}"`,
      `"${client.rg || ''}"`,
      `"${client.pis || ''}"`,
      `"${client.ctps || ''}"`,
      `"${client.ctpsSerie || ''}"`,
      `"${(client.motherName || '').replace(/"/g, '""')}"`,
      client.birthDate ? `"${new Date(client.birthDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""',
      `"${(client.profession || '').replace(/"/g, '""')}"`,
      `"${(client.nationality || '').replace(/"/g, '""')}"`,
      `"${client.maritalStatus || ''}"`,
      `"${client.email || ''}"`,
      `"${client.phone || ''}"`,
      `"${client.phone2 || ''}"`,
      `"${client.instagram || ''}"`,
      `"${client.facebook || ''}"`,
      `"${(client.address || '').replace(/"/g, '""')}"`,
      `"${(client.neighborhood || '').replace(/"/g, '""')}"`,
      `"${client.city || ''}"`,
      `"${client.state || ''}"`,
      `"${client.zipCode || ''}"`,
      `"${(client.representativeName || '').replace(/"/g, '""')}"`,
      `"${client.representativeCpf || ''}"`,
      `"${(client.customField1 || '').replace(/"/g, '""')}"`,
      `"${(client.customField2 || '').replace(/"/g, '""')}"`,
      `"${(client.tag || '').replace(/"/g, '""')}"`,
      `"${(client.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(client.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`,
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

async function generateCasesCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId };

  if (filters.search) {
    where.OR = [
      { processNumber: { contains: filters.search, mode: 'insensitive' } },
      { subject: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) where.status = filters.status;

  const cases = await prisma.case.findMany({
    where,
    include: {
      client: { select: { name: true, cpf: true } },
      lawyer: { select: { name: true, oab: true } },
      parts: {
        include: {
          client: { select: { name: true } },
          adverse: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Header com todos os campos (21 colunas) - ordem consistente com import
  const csvHeader = [
    'Número do Processo',
    'Cliente',
    'CPF Cliente',
    'Demandado',
    'Tribunal',
    'Assunto',
    'Valor',
    'Status',
    'Advogado Responsável',
    'OAB Advogado',
    'Prazo',
    'Data de Distribuição',
    'Fase',
    'Natureza',
    'Rito',
    'Comarca',
    'Vara',
    'Link do Processo',
    'Última Sincronização',
    'Observações',
    'Data Cadastro',
  ].join(',') + '\n';

  const csvRows = cases.map(c => {
    // Buscar demandado nas partes do processo
    const demandadoPart = c.parts?.find(p => p.type === 'DEMANDADO');
    const demandadoName = demandadoPart?.adverse?.name || demandadoPart?.client?.name || '';

    return [
      `"${c.processNumber || ''}"`,
      `"${(c.client?.name || '').replace(/"/g, '""')}"`,
      `"${c.client?.cpf || ''}"`,
      `"${(demandadoName || '').replace(/"/g, '""')}"`,
      `"${(c.court || '').replace(/"/g, '""')}"`,
      `"${(c.subject || '').replace(/"/g, '""')}"`,
      c.value ? `"R$ ${Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"` : '""',
      `"${c.status || ''}"`,
      `"${(c.lawyer?.name || '').replace(/"/g, '""')}"`,
      `"${c.lawyer?.oab || ''}"`,
      c.deadline ? `"${new Date(c.deadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""',
      c.distributionDate ? `"${new Date(c.distributionDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""',
      `"${(c.phase || '').replace(/"/g, '""')}"`,
      `"${(c.nature || '').replace(/"/g, '""')}"`,
      `"${(c.rite || '').replace(/"/g, '""')}"`,
      `"${(c.comarca || '').replace(/"/g, '""')}"`,
      `"${(c.vara || '').replace(/"/g, '""')}"`,
      `"${(c.linkProcesso || '').replace(/"/g, '""')}"`,
      c.lastSyncedAt ? `"${new Date(c.lastSyncedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""',
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(c.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`,
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

async function generateFinancialCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId };

  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    include: {
      client: { select: { name: true, cpf: true } },
      case: { select: { processNumber: true } },
      costCenter: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  // Header com todos os campos (12 colunas) - ordem consistente com import
  const csvHeader = [
    'Data',
    'Tipo',
    'Cliente',
    'CPF',
    'Processo',
    'Centro de Custo',
    'Descrição',
    'Valor',
    'Status',
    'Parcelado',
    'Número de Parcelas',
    'Intervalo (dias)',
  ].join(',') + '\n';

  const csvRows = transactions.map(t => {
    return [
      `"${new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`,
      `"${t.type === 'INCOME' ? 'Receita' : 'Despesa'}"`,
      `"${(t.client?.name || '').replace(/"/g, '""')}"`,
      `"${t.client?.cpf || ''}"`,
      `"${t.case?.processNumber || ''}"`,
      `"${(t.costCenter?.name || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"`,
      `"${t.status || ''}"`,
      `"${t.isInstallment ? 'Sim' : 'Não'}"`,
      `"${t.installmentCount || ''}"`,
      `"${t.installmentInterval || ''}"`,
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

async function generateScheduleCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId };

  if (filters.type) where.type = filters.type;

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: {
      client: { select: { name: true } },
      case: { select: { processNumber: true } },
      assignedUsers: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Header com todos os campos (12 colunas) - ordem consistente com import
  const csvHeader = [
    'Data',
    'Horário',
    'Título',
    'Tipo',
    'Prioridade',
    'Cliente',
    'Processo',
    'Responsáveis',
    'Status',
    'Status Kanban',
    'Hora Fim',
    'Descrição',
  ].join(',') + '\n';

  const csvRows = events.map(e => {
    const eventDate = new Date(e.date);
    const dateStr = eventDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const timeStr = eventDate.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    let endTimeStr = '';
    if (e.endDate) {
      const endEventDate = new Date(e.endDate);
      endTimeStr = endEventDate.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    }

    // Mapear status de conclusão
    let statusStr = e.completed ? 'Concluído' : 'Pendente';
    if (e.kanbanStatus === 'IN_PROGRESS') statusStr = 'Em Andamento';

    return [
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.type || ''}"`,
      `"${e.priority || ''}"`,
      `"${(e.client?.name || '').replace(/"/g, '""')}"`,
      `"${e.case?.processNumber || ''}"`,
      `"${e.assignedUsers.map(a => a.user.name).join(', ')}"`,
      `"${statusStr}"`,
      `"${e.kanbanStatus || ''}"`,
      `"${endTimeStr}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

async function generateLeadsCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId };

  if (filters.status) where.status = filters.status;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const csvHeader = 'Nome,Email,Telefone,Origem,Status,Motivo Contato,Observações,Data Cadastro\n';

  const csvRows = leads.map(l => {
    return [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.email || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.source || ''}"`,
      `"${l.status || ''}"`,
      `"${(l.contactReason || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(l.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`,
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

async function generateAccountsPayableCSV(companyId: string, filters: Record<string, any>): Promise<string> {
  const where: any = { companyId };

  if (filters.status) where.status = filters.status;

  const accounts = await prisma.accountPayable.findMany({
    where,
    orderBy: { dueDate: 'desc' },
  });

  const csvHeader = 'Fornecedor,Descrição,Valor,Vencimento,Categoria,Status,Recorrente,Data Pagamento\n';

  const csvRows = accounts.map(a => {
    return [
      `"${(a.supplier || '').replace(/"/g, '""')}"`,
      `"${(a.description || '').replace(/"/g, '""')}"`,
      `"R$ ${Number(a.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"`,
      `"${new Date(a.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"`,
      `"${a.category || ''}"`,
      `"${a.status || ''}"`,
      `"${a.isRecurring ? 'Sim' : 'Não'}"`,
      a.paidDate ? `"${new Date(a.paidDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}"` : '""',
    ].join(',');
  }).join('\n');

  return '\ufeff' + csvHeader + csvRows;
}

// Map de geradores
const csvGenerators: Record<ExportType, (companyId: string, filters: Record<string, any>) => Promise<string>> = {
  'clients': generateClientsCSV,
  'cases': generateCasesCSV,
  'financial': generateFinancialCSV,
  'schedule': generateScheduleCSV,
  'leads': generateLeadsCSV,
  'accounts-payable': generateAccountsPayableCSV,
};

// Labels para tipos de export
const exportTypeLabels: Record<ExportType, string> = {
  'clients': 'Clientes',
  'cases': 'Processos',
  'financial': 'Financeiro',
  'schedule': 'Agenda',
  'leads': 'Leads',
  'accounts-payable': 'Contas a Pagar',
};

// ============================================================================
// PROCESSADOR
// ============================================================================

if (ENABLE_QUEUE_PROCESSORS) {
  appLogger.info('Registering CSV export queue processor...');

  csvExportQueue.process('process-export', 2, async (job) => {
    const { jobId, exportType, companyId, userId, userEmail, filters, totalRecords } = job.data as ExportJobData;

    try {
      await updateExportStatus(jobId, {
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      appLogger.info('Processing CSV export', { jobId, exportType, companyId, totalRecords });

      // Gerar CSV
      const generator = csvGenerators[exportType];
      if (!generator) {
        throw new Error(`Tipo de export não suportado: ${exportType}`);
      }

      await updateExportStatus(jobId, { progress: 30 });

      const csvContent = await generator(companyId, filters);

      await updateExportStatus(jobId, { progress: 70 });

      // Buscar empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, backupEmail: true },
      });

      // Enviar email
      if (!SYSTEM_SMTP.host || !SYSTEM_SMTP.user || !SYSTEM_SMTP.password) {
        throw new Error('SMTP do sistema não configurado');
      }

      const transporter = nodemailer.createTransport({
        host: SYSTEM_SMTP.host,
        port: SYSTEM_SMTP.port,
        secure: SYSTEM_SMTP.port === 465,
        auth: {
          user: SYSTEM_SMTP.user,
          pass: SYSTEM_SMTP.password,
        },
      });

      const dateStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      const fileName = `${exportType}_${dateStr}.csv`;

      await transporter.sendMail({
        from: `"AdvWell Export" <${SYSTEM_SMTP.from}>`,
        to: userEmail,
        subject: `Exportação ${exportTypeLabels[exportType]} - ${company?.name || 'AdvWell'} - ${dateStr}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Exportação Concluída - AdvWell</h2>
            <p>Olá,</p>
            <p>Sua exportação de <strong>${exportTypeLabels[exportType]}</strong> foi processada com sucesso.</p>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Tipo:</strong> ${exportTypeLabels[exportType]}</p>
              <p style="margin: 5px 0;"><strong>Registros:</strong> ${totalRecords.toLocaleString('pt-BR')}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${dateStr} às ${timeStr}</p>
              <p style="margin: 5px 0;"><strong>Empresa:</strong> ${company?.name || '-'}</p>
            </div>

            <p>O arquivo CSV está anexado a este email.</p>

            <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
              Este é um email automático enviado pelo sistema AdvWell.<br>
              O arquivo foi gerado porque a exportação continha mais de ${SYNC_EXPORT_LIMIT.toLocaleString('pt-BR')} registros.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: csvContent,
            contentType: 'text/csv; charset=utf-8',
          },
        ],
      });

      await updateExportStatus(jobId, {
        status: 'completed',
        progress: 100,
        fileName,
        completedAt: new Date().toISOString(),
      });

      appLogger.info('CSV export completed and sent', { jobId, exportType, userEmail, totalRecords });

      return { success: true, fileName };

    } catch (error: any) {
      appLogger.error('CSV export failed', error as Error, { jobId, exportType });

      await updateExportStatus(jobId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  });

  // Event handlers
  csvExportQueue.on('completed', (job, result) => {
    appLogger.info('CSV export job completed', {
      jobId: job.data.jobId,
      exportType: job.data.exportType,
      result,
    });
  });

  csvExportQueue.on('failed', (job, err) => {
    appLogger.error('CSV export job failed', err as Error, {
      jobId: job.data.jobId,
      exportType: job.data.exportType,
    });
  });

} else {
  appLogger.info('CSV export queue processor DISABLED (ENABLE_QUEUE_PROCESSORS=false)');
}

// Estatísticas da fila
export const getExportQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    csvExportQueue.getWaitingCount(),
    csvExportQueue.getActiveCount(),
    csvExportQueue.getCompletedCount(),
    csvExportQueue.getFailedCount(),
    csvExportQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

export default csvExportQueue;
