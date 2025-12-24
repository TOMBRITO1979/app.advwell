import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import backupEmailService from '../services/backup-email.service';
import { appLogger } from '../utils/logger';

export class BackupEmailController {
  /**
   * Obtém a configuração de backup email da empresa
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          backupEmail: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      res.json({
        backupEmail: company.backupEmail || '',
        hasSmtpConfig: true, // Usa SMTP do sistema, sempre disponível
      });
    } catch (error) {
      appLogger.error('Erro ao buscar configuração de backup:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar configuração de backup' });
    }
  }

  /**
   * Atualiza o email de backup da empresa
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { backupEmail } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validar email se fornecido
      if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
        return res.status(400).json({ error: 'Email inválido' });
      }

      await prisma.company.update({
        where: { id: companyId },
        data: {
          backupEmail: backupEmail || null,
        },
      });

      res.json({
        message: backupEmail
          ? 'Email de backup configurado com sucesso! Backups serão enviados às 12h e 18h.'
          : 'Email de backup removido.',
        backupEmail: backupEmail || null,
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar configuração de backup:', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar configuração de backup' });
    }
  }

  /**
   * Envia um backup de teste manualmente
   */
  async sendTest(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se tem email de backup configurado
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { backupEmail: true },
      });

      if (!company?.backupEmail) {
        return res.status(400).json({ error: 'Configure um email de backup primeiro' });
      }

      // Enviar backup
      const result = await backupEmailService.sendBackupEmail(companyId);

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      appLogger.error('Erro ao enviar backup de teste:', error as Error);
      res.status(500).json({ error: 'Erro ao enviar backup de teste' });
    }
  }
}

export default new BackupEmailController();
