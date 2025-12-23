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

export default router;
