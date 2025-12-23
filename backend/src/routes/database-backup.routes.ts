import { Router, Response } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import databaseBackupService from '../services/database-backup.service';

const router = Router();

// Todas as rotas requerem SUPER_ADMIN
router.use(authenticate, requireSuperAdmin);

// POST /api/database-backup/test - Executa backup de teste
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[DatabaseBackup] Backup manual solicitado por ${req.user?.email}`);

    const result = await databaseBackupService.generateBackup();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        key: result.key,
        size: result.size,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error: any) {
    console.error('[DatabaseBackup] Erro no backup manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar backup: ' + error.message,
    });
  }
});

// POST /api/database-backup/cleanup - Limpa backups antigos
router.post('/cleanup', async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[DatabaseBackup] Limpeza manual solicitada por ${req.user?.email}`);

    const result = await databaseBackupService.cleanupOldBackups();

    res.json({
      success: true,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[DatabaseBackup] Erro na limpeza manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar backups: ' + error.message,
    });
  }
});

// GET /api/database-backup/list - Lista todos os backups disponiveis
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[DatabaseBackup] Listagem de backups solicitada por ${req.user?.email}`);

    const backups = await databaseBackupService.listBackups();

    res.json({
      success: true,
      count: backups.length,
      backups: backups.map((b) => ({
        key: b.key,
        fileName: b.fileName,
        size: b.size,
        sizeFormatted: `${(b.size / 1024 / 1024).toFixed(2)} MB`,
        lastModified: b.lastModified,
      })),
    });
  } catch (error: any) {
    console.error('[DatabaseBackup] Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar backups: ' + error.message,
    });
  }
});

// GET /api/database-backup/info/:key - Obtem informacoes detalhadas de um backup
router.get('/info/*', async (req: AuthRequest, res: Response) => {
  try {
    // O key pode conter barras, entao usamos o wildcard
    const backupKey = req.params[0];

    if (!backupKey) {
      return res.status(400).json({
        success: false,
        error: 'Chave do backup nao informada',
      });
    }

    console.log(`[DatabaseBackup] Info do backup ${backupKey} solicitada por ${req.user?.email}`);

    const info = await databaseBackupService.getBackupInfo(backupKey);

    if (!info) {
      return res.status(404).json({
        success: false,
        error: 'Backup nao encontrado',
      });
    }

    res.json({
      success: true,
      backup: {
        key: info.key,
        fileName: info.fileName,
        size: info.size,
        sizeFormatted: `${(info.size / 1024 / 1024).toFixed(2)} MB`,
        lastModified: info.lastModified,
        metadata: info.metadata,
      },
    });
  } catch (error: any) {
    console.error('[DatabaseBackup] Erro ao obter info do backup:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter informacoes do backup: ' + error.message,
    });
  }
});

// POST /api/database-backup/restore - Restaura banco de dados a partir de um backup
// ATENCAO: Esta operacao substitui todos os dados existentes!
router.post('/restore', async (req: AuthRequest, res: Response) => {
  try {
    const { backupKey, dryRun = true, tables } = req.body;

    if (!backupKey) {
      return res.status(400).json({
        success: false,
        error: 'Chave do backup nao informada',
      });
    }

    // Log detalhado para auditoria
    console.log(`[DatabaseBackup] ⚠️  RESTORE solicitado por ${req.user?.email}`);
    console.log(`[DatabaseBackup] Backup: ${backupKey}`);
    console.log(`[DatabaseBackup] Dry-run: ${dryRun}`);
    console.log(`[DatabaseBackup] Tabelas: ${tables ? tables.join(', ') : 'todas'}`);

    // Executar restauracao
    const result = await databaseBackupService.restoreFromBackup(backupKey, {
      dryRun,
      tables,
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        dryRun: result.dryRun,
        tablesRestored: result.tablesRestored,
        recordsRestored: result.recordsRestored,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        errors: result.errors,
      });
    }
  } catch (error: any) {
    console.error('[DatabaseBackup] Erro no restore:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar backup: ' + error.message,
    });
  }
});

export default router;
