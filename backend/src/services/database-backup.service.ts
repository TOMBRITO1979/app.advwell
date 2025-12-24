import prisma from '../utils/prisma';
import { s3Client } from '../utils/s3';
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Configuracao
const BACKUP_PREFIX = 'backups/database/';
const RETENTION_DAYS = 30;

interface BackupResult {
  success: boolean;
  message: string;
  key?: string;
  size?: number;
}

interface BackupInfo {
  key: string;
  fileName: string;
  size: number;
  lastModified: Date;
  metadata?: {
    version: string;
    timestamp: string;
    tables: string[];
    recordCounts: Record<string, number>;
  };
}

interface RestoreResult {
  success: boolean;
  message: string;
  tablesRestored?: string[];
  recordsRestored?: Record<string, number>;
  errors?: string[];
  dryRun?: boolean;
}

class DatabaseBackupService {
  /**
   * Gera backup completo do banco de dados
   * Exporta todas as tabelas principais como JSON
   */
  async generateBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    console.log('[DatabaseBackup] Iniciando backup do banco de dados...');

    try {
      // Verificar configuracao S3
      if (!config.aws.s3BucketName || !config.aws.accessKeyId) {
        return { success: false, message: 'Configuracao S3 incompleta' };
      }

      // Exportar todas as tabelas
      const backupData = await this.exportAllTables();

      // Criar metadata
      const metadata = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        tables: Object.keys(backupData),
        recordCounts: {} as Record<string, number>,
      };

      for (const [table, records] of Object.entries(backupData)) {
        metadata.recordCounts[table] = (records as any[]).length;
      }

      const fullBackup = {
        metadata,
        data: backupData,
      };

      // Serializar e comprimir
      const jsonData = JSON.stringify(fullBackup, null, 0);
      const compressedData = await gzip(Buffer.from(jsonData));

      // Gerar nome do arquivo
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `backup-${dateStr}.json.gz`;
      const s3Key = `${BACKUP_PREFIX}${fileName}`;

      // Upload para S3 com criptografia em repouso
      const command = new PutObjectCommand({
        Bucket: config.aws.s3BucketName,
        Key: s3Key,
        Body: compressedData,
        ContentType: 'application/gzip',
        ContentEncoding: 'gzip',
        // AUDITORIA: Server-Side Encryption para proteção de backups em repouso
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-version': '1.0',
          'backup-timestamp': metadata.timestamp,
          'tables-count': String(metadata.tables.length),
        },
      });

      await s3Client.send(command);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const sizeMB = (compressedData.length / 1024 / 1024).toFixed(2);

      console.log(`[DatabaseBackup] Backup concluido: ${s3Key} (${sizeMB}MB) em ${duration}s`);

      return {
        success: true,
        message: `Backup criado com sucesso: ${fileName} (${sizeMB}MB)`,
        key: s3Key,
        size: compressedData.length,
      };
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro ao criar backup:', error);
      return { success: false, message: `Erro ao criar backup: ${error.message}` };
    }
  }

  /**
   * Exporta todas as tabelas principais do banco
   */
  private async exportAllTables(): Promise<Record<string, any[]>> {
    const [
      companies,
      users,
      clients,
      cases,
      caseMovements,
      caseParts,
      caseDocuments,
      documents,
      scheduleEvents,
      eventAssignments,
      financialTransactions,
      installmentPayments,
      accountsPayable,
      permissions,
      emailCampaigns,
      campaignRecipients,
      leads,
      legalDocuments,
      servicePlans,
      clientSubscriptions,
      consentLogs,
      dataRequests,
      auditLogs,
    ] = await Promise.all([
      prisma.company.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          role: true,
          active: true,
          emailVerified: true,
          phone: true,
          mobile: true,
          birthDate: true,
          profilePhoto: true,
          hideSidebar: true,
          createdAt: true,
          updatedAt: true,
          // Excluir campos sensiveis: password, tokens, etc
        },
      }),
      prisma.client.findMany(),
      prisma.case.findMany(),
      prisma.caseMovement.findMany(),
      prisma.casePart.findMany(),
      prisma.caseDocument.findMany(),
      prisma.document.findMany(),
      prisma.scheduleEvent.findMany(),
      prisma.eventAssignment.findMany(),
      prisma.financialTransaction.findMany(),
      prisma.installmentPayment.findMany(),
      prisma.accountPayable.findMany(),
      prisma.permission.findMany(),
      prisma.emailCampaign.findMany(),
      prisma.campaignRecipient.findMany(),
      prisma.lead.findMany(),
      prisma.legalDocument.findMany(),
      prisma.servicePlan.findMany(),
      prisma.clientSubscription.findMany(),
      prisma.consentLog.findMany(),
      prisma.dataRequest.findMany(),
      prisma.auditLog.findMany(),
    ]);

    return {
      companies,
      users,
      clients,
      cases,
      caseMovements,
      caseParts,
      caseDocuments,
      documents,
      scheduleEvents,
      eventAssignments,
      financialTransactions,
      installmentPayments,
      accountsPayable,
      permissions,
      emailCampaigns,
      campaignRecipients,
      leads,
      legalDocuments,
      servicePlans,
      clientSubscriptions,
      consentLogs,
      dataRequests,
      auditLogs,
    };
  }

  /**
   * Remove backups antigos (mais de RETENTION_DAYS dias)
   */
  async cleanupOldBackups(): Promise<{ deleted: number; errors: number }> {
    console.log(`[DatabaseBackup] Limpando backups com mais de ${RETENTION_DAYS} dias...`);

    try {
      // Listar objetos no prefixo de backup
      const listCommand = new ListObjectsV2Command({
        Bucket: config.aws.s3BucketName,
        Prefix: BACKUP_PREFIX,
      });

      const response = await s3Client.send(listCommand);
      const objects = response.Contents || [];

      if (objects.length === 0) {
        console.log('[DatabaseBackup] Nenhum backup encontrado para limpeza');
        return { deleted: 0, errors: 0 };
      }

      // Filtrar objetos antigos
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      const oldObjects = objects.filter((obj) => {
        if (!obj.LastModified) return false;
        return obj.LastModified < cutoffDate;
      });

      if (oldObjects.length === 0) {
        console.log('[DatabaseBackup] Nenhum backup antigo para remover');
        return { deleted: 0, errors: 0 };
      }

      // Deletar objetos antigos
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: config.aws.s3BucketName,
        Delete: {
          Objects: oldObjects.map((obj) => ({ Key: obj.Key })),
        },
      });

      const deleteResponse = await s3Client.send(deleteCommand);
      const deleted = deleteResponse.Deleted?.length || 0;
      const errors = deleteResponse.Errors?.length || 0;

      console.log(`[DatabaseBackup] Limpeza concluida: ${deleted} removidos, ${errors} erros`);

      return { deleted, errors };
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro na limpeza de backups:', error);
      return { deleted: 0, errors: 1 };
    }
  }

  /**
   * Executa backup e limpeza (chamado pelo cron)
   */
  async runDailyBackup(): Promise<void> {
    console.log('[DatabaseBackup] ===== INICIO DO BACKUP DIARIO =====');

    // 1. Criar novo backup
    const backupResult = await this.generateBackup();
    if (!backupResult.success) {
      console.error('[DatabaseBackup] Falha ao criar backup:', backupResult.message);
      return;
    }

    // 2. Limpar backups antigos
    await this.cleanupOldBackups();

    console.log('[DatabaseBackup] ===== FIM DO BACKUP DIARIO =====');
  }

  /**
   * Lista todos os backups disponiveis no S3
   */
  async listBackups(): Promise<BackupInfo[]> {
    console.log('[DatabaseBackup] Listando backups disponiveis...');

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: config.aws.s3BucketName,
        Prefix: BACKUP_PREFIX,
      });

      const response = await s3Client.send(listCommand);
      const objects = response.Contents || [];

      const backups: BackupInfo[] = objects
        .filter((obj) => obj.Key && obj.Key.endsWith('.json.gz'))
        .map((obj) => ({
          key: obj.Key!,
          fileName: obj.Key!.replace(BACKUP_PREFIX, ''),
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      console.log(`[DatabaseBackup] Encontrados ${backups.length} backups`);
      return backups;
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Obtem informacoes detalhadas de um backup especifico
   */
  async getBackupInfo(backupKey: string): Promise<BackupInfo | null> {
    console.log(`[DatabaseBackup] Obtendo informacoes do backup: ${backupKey}`);

    try {
      // Baixar e descomprimir o backup para obter metadata
      const backupData = await this.downloadBackup(backupKey);
      if (!backupData) {
        return null;
      }

      const backups = await this.listBackups();
      const backupFile = backups.find((b) => b.key === backupKey);

      if (!backupFile) {
        return null;
      }

      return {
        ...backupFile,
        metadata: backupData.metadata,
      };
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro ao obter informacoes do backup:', error);
      return null;
    }
  }

  /**
   * Baixa e descomprime um backup do S3
   */
  private async downloadBackup(backupKey: string): Promise<any | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.aws.s3BucketName,
        Key: backupKey,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        console.error('[DatabaseBackup] Backup vazio');
        return null;
      }

      // Converter stream para buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const compressedData = Buffer.concat(chunks);

      // Descomprimir
      const decompressedData = await gunzip(compressedData);
      const jsonData = decompressedData.toString('utf-8');

      return JSON.parse(jsonData);
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro ao baixar backup:', error);
      return null;
    }
  }

  /**
   * Restaura o banco de dados a partir de um backup
   * ATENCAO: Esta operacao substitui todos os dados existentes!
   *
   * @param backupKey - Chave do backup no S3
   * @param options.dryRun - Se true, apenas valida o backup sem restaurar
   * @param options.tables - Lista de tabelas para restaurar (todas se nao especificado)
   */
  async restoreFromBackup(
    backupKey: string,
    options: { dryRun?: boolean; tables?: string[] } = {}
  ): Promise<RestoreResult> {
    const { dryRun = false, tables } = options;
    const startTime = Date.now();

    console.log(`[DatabaseBackup] ${dryRun ? '[DRY-RUN] ' : ''}Iniciando restauracao do backup: ${backupKey}`);

    try {
      // 1. Validar backup key
      if (!backupKey.startsWith(BACKUP_PREFIX) || !backupKey.endsWith('.json.gz')) {
        return { success: false, message: 'Chave de backup invalida' };
      }

      // 2. Baixar e validar backup
      const backupData = await this.downloadBackup(backupKey);
      if (!backupData) {
        return { success: false, message: 'Falha ao baixar backup' };
      }

      // 3. Validar estrutura do backup
      if (!backupData.metadata || !backupData.data) {
        return { success: false, message: 'Estrutura de backup invalida' };
      }

      const { metadata, data } = backupData;

      // 4. Validar versao do backup
      if (metadata.version !== '1.0') {
        return { success: false, message: `Versao de backup nao suportada: ${metadata.version}` };
      }

      // 5. Determinar tabelas a restaurar
      const tablesToRestore = tables || Object.keys(data);
      const availableTables = Object.keys(data);
      const invalidTables = tablesToRestore.filter((t) => !availableTables.includes(t));

      if (invalidTables.length > 0) {
        return { success: false, message: `Tabelas nao encontradas no backup: ${invalidTables.join(', ')}` };
      }

      // 6. Se dry-run, retornar informacoes sem restaurar
      if (dryRun) {
        const recordCounts: Record<string, number> = {};
        for (const table of tablesToRestore) {
          recordCounts[table] = (data[table] as any[]).length;
        }

        return {
          success: true,
          message: `[DRY-RUN] Backup valido. ${tablesToRestore.length} tabelas prontas para restauracao.`,
          tablesRestored: tablesToRestore,
          recordsRestored: recordCounts,
          dryRun: true,
        };
      }

      // 7. Executar restauracao em transacao
      console.log(`[DatabaseBackup] Restaurando ${tablesToRestore.length} tabelas...`);

      const errors: string[] = [];
      const recordsRestored: Record<string, number> = {};

      // Ordem de restauracao respeitando foreign keys
      const restoreOrder = [
        'companies',
        'users',
        'servicePlans',
        'clients',
        'cases',
        'caseMovements',
        'caseParts',
        'caseDocuments',
        'documents',
        'scheduleEvents',
        'eventAssignments',
        'financialTransactions',
        'installmentPayments',
        'accountsPayable',
        'permissions',
        'emailCampaigns',
        'campaignRecipients',
        'leads',
        'legalDocuments',
        'clientSubscriptions',
        'consentLogs',
        'dataRequests',
        'auditLogs',
      ];

      // Filtrar apenas tabelas que existem no backup e foram solicitadas
      const orderedTables = restoreOrder.filter(
        (t) => tablesToRestore.includes(t) && data[t]
      );

      // Usar transacao para garantir consistencia
      await prisma.$transaction(async (tx) => {
        for (const tableName of orderedTables) {
          const records = data[tableName] as any[];

          if (!records || records.length === 0) {
            recordsRestored[tableName] = 0;
            continue;
          }

          try {
            // Deletar dados existentes
            await this.deleteTableData(tx, tableName);

            // Inserir novos dados
            const insertedCount = await this.insertTableData(tx, tableName, records);
            recordsRestored[tableName] = insertedCount;

            console.log(`[DatabaseBackup] Restaurado ${tableName}: ${insertedCount} registros`);
          } catch (error: any) {
            const errorMsg = `Erro ao restaurar ${tableName}: ${error.message}`;
            console.error(`[DatabaseBackup] ${errorMsg}`);
            errors.push(errorMsg);
            throw error; // Aborta transacao
          }
        }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalRecords = Object.values(recordsRestored).reduce((a, b) => a + b, 0);

      console.log(`[DatabaseBackup] Restauracao concluida em ${duration}s. Total: ${totalRecords} registros`);

      return {
        success: true,
        message: `Backup restaurado com sucesso em ${duration}s. ${totalRecords} registros restaurados.`,
        tablesRestored: orderedTables,
        recordsRestored,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      console.error('[DatabaseBackup] Erro na restauracao:', error);
      return {
        success: false,
        message: `Erro na restauracao: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  /**
   * Deleta todos os dados de uma tabela
   */
  private async deleteTableData(tx: any, tableName: string): Promise<void> {
    const modelMap: Record<string, any> = {
      companies: tx.company,
      users: tx.user,
      clients: tx.client,
      cases: tx.case,
      caseMovements: tx.caseMovement,
      caseParts: tx.casePart,
      caseDocuments: tx.caseDocument,
      documents: tx.document,
      scheduleEvents: tx.scheduleEvent,
      eventAssignments: tx.eventAssignment,
      financialTransactions: tx.financialTransaction,
      installmentPayments: tx.installmentPayment,
      accountsPayable: tx.accountPayable,
      permissions: tx.permission,
      emailCampaigns: tx.emailCampaign,
      campaignRecipients: tx.campaignRecipient,
      leads: tx.lead,
      legalDocuments: tx.legalDocument,
      servicePlans: tx.servicePlan,
      clientSubscriptions: tx.clientSubscription,
      consentLogs: tx.consentLog,
      dataRequests: tx.dataRequest,
      auditLogs: tx.auditLog,
    };

    const model = modelMap[tableName];
    if (model) {
      await model.deleteMany({});
    }
  }

  /**
   * Insere dados em uma tabela
   */
  private async insertTableData(tx: any, tableName: string, records: any[]): Promise<number> {
    const modelMap: Record<string, any> = {
      companies: tx.company,
      users: tx.user,
      clients: tx.client,
      cases: tx.case,
      caseMovements: tx.caseMovement,
      caseParts: tx.casePart,
      caseDocuments: tx.caseDocument,
      documents: tx.document,
      scheduleEvents: tx.scheduleEvent,
      eventAssignments: tx.eventAssignment,
      financialTransactions: tx.financialTransaction,
      installmentPayments: tx.installmentPayment,
      accountsPayable: tx.accountPayable,
      permissions: tx.permission,
      emailCampaigns: tx.emailCampaign,
      campaignRecipients: tx.campaignRecipient,
      leads: tx.lead,
      legalDocuments: tx.legalDocument,
      servicePlans: tx.servicePlan,
      clientSubscriptions: tx.clientSubscription,
      consentLogs: tx.consentLog,
      dataRequests: tx.dataRequest,
      auditLogs: tx.auditLog,
    };

    const model = modelMap[tableName];
    if (!model) {
      return 0;
    }

    // Converter datas de string para Date objects
    const processedRecords = records.map((record) => this.processDateFields(record));

    // Inserir em lotes para melhor performance
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < processedRecords.length; i += batchSize) {
      const batch = processedRecords.slice(i, i + batchSize);
      await model.createMany({
        data: batch,
        skipDuplicates: true,
      });
      insertedCount += batch.length;
    }

    return insertedCount;
  }

  /**
   * Converte campos de data de string para Date objects
   */
  private processDateFields(record: any): any {
    const dateFields = [
      'createdAt',
      'updatedAt',
      'birthDate',
      'dueDate',
      'paymentDate',
      'startDate',
      'endDate',
      'trialEndsAt',
      'distributionDate',
      'lastSyncDate',
      'sentAt',
      'deliveredAt',
      'openedAt',
      'clickedAt',
      'deletedAt',
    ];

    const processed = { ...record };

    for (const field of dateFields) {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[field] = new Date(processed[field]);
      }
    }

    return processed;
  }
}

export default new DatabaseBackupService();
