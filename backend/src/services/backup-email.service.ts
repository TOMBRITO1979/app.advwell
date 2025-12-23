import prisma from '../utils/prisma';
import nodemailer from 'nodemailer';

// Configuração SMTP do sistema (variáveis de ambiente)
const SYSTEM_SMTP = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  from: process.env.SMTP_FROM || 'noreply@advwell.pro',
};

// Tipos de tradução
const PERSON_TYPE_LABELS: { [key: string]: string } = {
  'FISICA': 'Pessoa Física',
  'JURIDICA': 'Pessoa Jurídica',
};

const CASE_STATUS_LABELS: { [key: string]: string } = {
  'PENDENTE': 'Pendente',
  'ACTIVE': 'Ativo',
  'ARCHIVED': 'Arquivado',
  'FINISHED': 'Finalizado',
};

const EVENT_TYPE_LABELS: { [key: string]: string } = {
  'COMPROMISSO': 'Compromisso',
  'TAREFA': 'Tarefa',
  'PRAZO': 'Prazo',
  'AUDIENCIA': 'Audiência',
  'GOOGLE_MEET': 'Google Meet',
};

const PRIORITY_LABELS: { [key: string]: string } = {
  'BAIXA': 'Baixa',
  'MEDIA': 'Média',
  'ALTA': 'Alta',
  'URGENTE': 'Urgente',
};

class BackupEmailService {
  /**
   * Gera CSV de clientes para uma empresa
   */
  async generateClientCSV(companyId: string): Promise<string> {
    const clients = await prisma.client.findMany({
      where: {
        companyId,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvHeader = 'Tipo,Nome,CPF/CNPJ,RG,Email,Telefone,Endereço,Cidade,Estado,CEP,Profissão,Estado Civil,Data de Nascimento,Representante Legal,CPF Representante,Observações,Data de Cadastro\n';

    const csvRows = clients.map(client => {
      const personType = `"${PERSON_TYPE_LABELS[client.personType || 'FISICA'] || client.personType || ''}"`;
      const name = `"${(client.name || '').replace(/"/g, '""')}"`;
      const cpf = `"${client.cpf || ''}"`;
      const rg = `"${client.rg || ''}"`;
      const email = `"${client.email || ''}"`;
      const phone = `"${client.phone || ''}"`;
      const address = `"${(client.address || '').replace(/"/g, '""')}"`;
      const city = `"${client.city || ''}"`;
      const state = `"${client.state || ''}"`;
      const zipCode = `"${client.zipCode || ''}"`;
      const profession = `"${client.profession || ''}"`;
      const maritalStatus = `"${client.maritalStatus || ''}"`;
      const birthDate = client.birthDate ? `"${new Date(client.birthDate).toLocaleDateString('pt-BR')}"` : '""';
      const representativeName = `"${(client.representativeName || '').replace(/"/g, '""')}"`;
      const representativeCpf = `"${client.representativeCpf || ''}"`;
      const notes = `"${(client.notes || '').replace(/"/g, '""')}"`;
      const createdAt = `"${new Date(client.createdAt).toLocaleDateString('pt-BR')}"`;

      return `${personType},${name},${cpf},${rg},${email},${phone},${address},${city},${state},${zipCode},${profession},${maritalStatus},${birthDate},${representativeName},${representativeCpf},${notes},${createdAt}`;
    }).join('\n');

    return '\ufeff' + csvHeader + csvRows;
  }

  /**
   * Gera CSV de processos para uma empresa
   */
  async generateCaseCSV(companyId: string): Promise<string> {
    const cases = await prisma.case.findMany({
      where: { companyId },
      include: {
        client: {
          select: { name: true, cpf: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvHeader = 'Número do Processo,Cliente,CPF Cliente,Tribunal,Assunto,Valor,Status,Última Sincronização,Data de Cadastro,Observações\n';

    const csvRows = cases.map(caseItem => {
      const processNumber = `"${caseItem.processNumber || ''}"`;
      const clientName = `"${(caseItem.client?.name || '').replace(/"/g, '""')}"`;
      const clientCpf = `"${caseItem.client?.cpf || ''}"`;
      const court = `"${(caseItem.court || '').replace(/"/g, '""')}"`;
      const subject = `"${(caseItem.subject || '').replace(/"/g, '""')}"`;
      const value = caseItem.value ? `"R$ ${Number(caseItem.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"` : '""';
      const status = `"${CASE_STATUS_LABELS[caseItem.status] || caseItem.status || ''}"`;
      const lastSyncedAt = caseItem.lastSyncedAt ? `"${new Date(caseItem.lastSyncedAt).toLocaleString('pt-BR')}"` : '""';
      const createdAt = `"${new Date(caseItem.createdAt).toLocaleDateString('pt-BR')}"`;
      const notes = `"${(caseItem.notes || '').replace(/"/g, '""')}"`;

      return `${processNumber},${clientName},${clientCpf},${court},${subject},${value},${status},${lastSyncedAt},${createdAt},${notes}`;
    }).join('\n');

    return '\ufeff' + csvHeader + csvRows;
  }

  /**
   * Gera CSV de eventos da agenda para uma empresa
   */
  async generateScheduleCSV(companyId: string): Promise<string> {
    const events = await prisma.scheduleEvent.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
      include: {
        client: { select: { name: true } },
        case: { select: { processNumber: true } },
        assignedUsers: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
    });

    const csvHeader = 'Título,Descrição,Tipo,Prioridade,Data/Hora,Data/Hora Fim,Cliente,Processo,Responsáveis,Concluído,Link Google Meet\n';

    const csvRows = events.map(event => {
      const title = `"${(event.title || '').replace(/"/g, '""')}"`;
      const description = `"${(event.description || '').replace(/"/g, '""')}"`;
      const type = `"${EVENT_TYPE_LABELS[event.type] || event.type || ''}"`;
      const priority = `"${PRIORITY_LABELS[event.priority] || event.priority || ''}"`;
      const date = `"${new Date(event.date).toLocaleString('pt-BR')}"`;
      const endDate = event.endDate ? `"${new Date(event.endDate).toLocaleString('pt-BR')}"` : '""';
      const clientName = `"${(event.client?.name || '').replace(/"/g, '""')}"`;
      const processNumber = `"${event.case?.processNumber || ''}"`;
      const assignedUsers = `"${event.assignedUsers.map(a => a.user.name).join(', ')}"`;
      const completed = event.completed ? '"Sim"' : '"Não"';
      const googleMeetLink = `"${event.googleMeetLink || ''}"`;

      return `${title},${description},${type},${priority},${date},${endDate},${clientName},${processNumber},${assignedUsers},${completed},${googleMeetLink}`;
    }).join('\n');

    return '\ufeff' + csvHeader + csvRows;
  }

  /**
   * Envia email de backup para uma empresa usando SMTP do sistema
   */
  async sendBackupEmail(companyId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se SMTP do sistema está configurado
      if (!SYSTEM_SMTP.host || !SYSTEM_SMTP.user || !SYSTEM_SMTP.password) {
        return { success: false, message: 'SMTP do sistema não configurado' };
      }

      // Buscar empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, message: 'Empresa não encontrada' };
      }

      if (!company.backupEmail) {
        return { success: false, message: 'Email de backup não configurado' };
      }

      // Gerar os CSVs
      const [clientCSV, caseCSV, scheduleCSV] = await Promise.all([
        this.generateClientCSV(companyId),
        this.generateCaseCSV(companyId),
        this.generateScheduleCSV(companyId),
      ]);

      // Criar transporter com SMTP do sistema
      const transporter = nodemailer.createTransport({
        host: SYSTEM_SMTP.host,
        port: SYSTEM_SMTP.port,
        secure: SYSTEM_SMTP.port === 465,
        auth: {
          user: SYSTEM_SMTP.user,
          pass: SYSTEM_SMTP.password,
        },
      });

      // Data formatada para nome dos arquivos
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

      // Enviar email com anexos
      await transporter.sendMail({
        from: `"AdvWell Backup" <${SYSTEM_SMTP.from}>`,
        to: company.backupEmail,
        subject: `Backup AdvWell - ${company.name} - ${dateStr} ${timeStr}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Backup Automático - AdvWell</h2>
            <p>Olá,</p>
            <p>Segue em anexo o backup automático dos dados do escritório <strong>${company.name}</strong>.</p>
            <p><strong>Data:</strong> ${dateStr} às ${timeStr}</p>
            <h3 style="color: #1e40af;">Arquivos anexados:</h3>
            <ul>
              <li><strong>clientes_${dateStr}.csv</strong> - Lista de todos os clientes cadastrados</li>
              <li><strong>processos_${dateStr}.csv</strong> - Lista de todos os processos cadastrados</li>
              <li><strong>agenda_${dateStr}.csv</strong> - Lista de todos os eventos da agenda</li>
            </ul>
            <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
              Este é um email automático enviado pelo sistema AdvWell.<br>
              Os backups são enviados automaticamente às 12h e 18h.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `clientes_${dateStr}.csv`,
            content: clientCSV,
            contentType: 'text/csv; charset=utf-8',
          },
          {
            filename: `processos_${dateStr}.csv`,
            content: caseCSV,
            contentType: 'text/csv; charset=utf-8',
          },
          {
            filename: `agenda_${dateStr}.csv`,
            content: scheduleCSV,
            contentType: 'text/csv; charset=utf-8',
          },
        ],
      });

      console.log(`[BackupEmail] Backup enviado com sucesso para ${company.backupEmail} (empresa: ${company.name})`);
      return { success: true, message: 'Backup enviado com sucesso!' };
    } catch (error: any) {
      console.error(`[BackupEmail] Erro ao enviar backup para empresa ${companyId}:`, error);
      return { success: false, message: `Erro ao enviar backup: ${error.message}` };
    }
  }

  /**
   * Envia backup para todas as empresas com backupEmail configurado
   * Chamado pelo cron job
   */
  async sendBackupToAllCompanies(): Promise<void> {
    try {
      // Verificar se SMTP do sistema está configurado
      if (!SYSTEM_SMTP.host || !SYSTEM_SMTP.user || !SYSTEM_SMTP.password) {
        console.error('[BackupEmail] SMTP do sistema não configurado, abortando');
        return;
      }

      // Buscar todas as empresas ativas com backupEmail configurado
      const companies = await prisma.company.findMany({
        where: {
          backupEmail: { not: null },
          active: true,
        },
        select: { id: true, name: true, backupEmail: true },
      });

      console.log(`[BackupEmail] Iniciando envio de backup para ${companies.length} empresa(s)`);

      for (const company of companies) {
        const result = await this.sendBackupEmail(company.id);
        if (!result.success) {
          console.error(`[BackupEmail] Falha no backup da empresa ${company.name}: ${result.message}`);
        }
      }

      console.log(`[BackupEmail] Processo de backup concluído`);
    } catch (error) {
      console.error('[BackupEmail] Erro no processo de backup:', error);
    }
  }
}

export default new BackupEmailService();
