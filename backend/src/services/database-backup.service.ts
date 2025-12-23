import prisma from '../utils/prisma';
import { s3Client } from '../utils/s3';
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

// Configuracao
const BACKUP_PREFIX = 'backups/database/';
const RETENTION_DAYS = 30;

interface BackupResult {
  success: boolean;
  message: string;
  key?: string;
  size?: number;
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

      // Upload para S3
      const command = new PutObjectCommand({
        Bucket: config.aws.s3BucketName,
        Key: s3Key,
        Body: compressedData,
        ContentType: 'application/gzip',
        ContentEncoding: 'gzip',
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
}

export default new DatabaseBackupService();
