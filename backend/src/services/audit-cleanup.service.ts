import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

/**
 * AUDITORIA: Servico de limpeza de logs de auditoria
 * Remove logs com mais de 365 dias para evitar crescimento indefinido
 * Mantém conformidade com LGPD (retenção mínima necessária)
 */

// Configuração de retenção
const RETENTION_DAYS = 365; // 1 ano de retenção
const BATCH_SIZE = 1000; // Deleta em lotes para não sobrecarregar o banco

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  batchesProcessed: number;
  duration: number;
  error?: string;
}

class AuditCleanupService {
  /**
   * Executa limpeza de logs antigos
   * Remove registros com mais de RETENTION_DAYS dias
   */
  async cleanupOldLogs(): Promise<CleanupResult> {
    const startTime = Date.now();
    let totalDeleted = 0;
    let batchesProcessed = 0;

    try {
      // Calcular data de corte
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      appLogger.info('Iniciando limpeza de logs de auditoria', {
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: RETENTION_DAYS,
      });

      // Contar total de registros a serem deletados
      const totalToDelete = await prisma.auditLog.count({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      if (totalToDelete === 0) {
        appLogger.info('Nenhum log de auditoria antigo para limpar');
        return {
          success: true,
          deletedCount: 0,
          batchesProcessed: 0,
          duration: Date.now() - startTime,
        };
      }

      appLogger.info(`Encontrados ${totalToDelete} logs de auditoria para limpar`);

      // Deletar em lotes para não sobrecarregar o banco
      let hasMore = true;
      while (hasMore) {
        // Buscar IDs dos registros mais antigos
        const oldLogs = await prisma.auditLog.findMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
          select: { id: true },
          take: BATCH_SIZE,
          orderBy: { createdAt: 'asc' },
        });

        if (oldLogs.length === 0) {
          hasMore = false;
          break;
        }

        // Deletar o lote
        const deleteResult = await prisma.auditLog.deleteMany({
          where: {
            id: {
              in: oldLogs.map((log) => log.id),
            },
          },
        });

        totalDeleted += deleteResult.count;
        batchesProcessed++;

        appLogger.info(`Lote ${batchesProcessed} processado: ${deleteResult.count} registros deletados`);

        // Se deletamos menos que o batch size, acabou
        if (oldLogs.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      const duration = Date.now() - startTime;
      appLogger.info('Limpeza de logs de auditoria concluída', {
        deletedCount: totalDeleted,
        batchesProcessed,
        durationMs: duration,
      });

      return {
        success: true,
        deletedCount: totalDeleted,
        batchesProcessed,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.error('Erro na limpeza de logs de auditoria', error, {
        deletedCount: totalDeleted,
        batchesProcessed,
        durationMs: duration,
      });

      return {
        success: false,
        deletedCount: totalDeleted,
        batchesProcessed,
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Retorna estatísticas dos logs de auditoria
   */
  async getStats(): Promise<{
    totalLogs: number;
    logsOlderThan30Days: number;
    logsOlderThan90Days: number;
    logsOlderThan365Days: number;
    oldestLogDate: Date | null;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    const [
      totalLogs,
      logsOlderThan30Days,
      logsOlderThan90Days,
      logsOlderThan365Days,
      oldestLog,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      prisma.auditLog.count({ where: { createdAt: { lt: ninetyDaysAgo } } }),
      prisma.auditLog.count({ where: { createdAt: { lt: yearAgo } } }),
      prisma.auditLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);

    return {
      totalLogs,
      logsOlderThan30Days,
      logsOlderThan90Days,
      logsOlderThan365Days,
      oldestLogDate: oldestLog?.createdAt || null,
    };
  }
}

export default new AuditCleanupService();
