import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';

export class GoogleCalendarConfigController {
  /**
   * Retorna a configuração do Google Calendar da empresa
   * GET /api/google-calendar-config
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const config = await prisma.googleCalendarCompanyConfig.findUnique({
        where: { companyId },
      });

      if (!config) {
        return res.json({
          configured: false,
          isActive: false,
        });
      }

      // Não retornar o clientSecret descriptografado
      res.json({
        configured: true,
        clientId: config.clientId,
        redirectUri: config.redirectUri || this.getDefaultRedirectUri(),
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar configuração Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
  }

  /**
   * Salva ou atualiza a configuração do Google Calendar da empresa
   * POST /api/google-calendar-config
   */
  async save(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { clientId, clientSecret, redirectUri, isActive } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validar campos obrigatórios
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID é obrigatório' });
      }

      // Verificar se já existe configuração
      const existing = await prisma.googleCalendarCompanyConfig.findUnique({
        where: { companyId },
      });

      let config;

      if (existing) {
        // Atualizar - só criptografa clientSecret se foi enviado novo
        const updateData: any = {
          clientId,
          redirectUri: redirectUri || null,
          isActive: isActive !== undefined ? isActive : true,
        };

        // Só atualiza o secret se um novo foi enviado
        if (clientSecret && clientSecret.trim() !== '') {
          updateData.clientSecret = encrypt(clientSecret);
        }

        config = await prisma.googleCalendarCompanyConfig.update({
          where: { companyId },
          data: updateData,
        });

        appLogger.info('Configuração Google Calendar atualizada', { companyId });
      } else {
        // Criar nova - clientSecret é obrigatório
        if (!clientSecret) {
          return res.status(400).json({ error: 'Client Secret é obrigatório' });
        }

        config = await prisma.googleCalendarCompanyConfig.create({
          data: {
            companyId,
            clientId,
            clientSecret: encrypt(clientSecret),
            redirectUri: redirectUri || null,
            isActive: isActive !== undefined ? isActive : true,
          },
        });

        appLogger.info('Configuração Google Calendar criada', { companyId });
      }

      res.json({
        configured: true,
        clientId: config.clientId,
        redirectUri: config.redirectUri || this.getDefaultRedirectUri(),
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      });
    } catch (error) {
      appLogger.error('Erro ao salvar configuração Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
  }

  /**
   * Remove a configuração do Google Calendar da empresa
   * DELETE /api/google-calendar-config
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const existing = await prisma.googleCalendarCompanyConfig.findUnique({
        where: { companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      // Remover também todas as conexões de usuários desta empresa
      await prisma.googleCalendarConfig.deleteMany({
        where: {
          user: {
            companyId,
          },
        },
      });

      await prisma.googleCalendarCompanyConfig.delete({
        where: { companyId },
      });

      appLogger.info('Configuração Google Calendar removida', { companyId });

      res.json({ message: 'Configuração removida com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao remover configuração Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao remover configuração' });
    }
  }

  /**
   * Testa a configuração do Google Calendar
   * POST /api/google-calendar-config/test
   */
  async test(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const config = await prisma.googleCalendarCompanyConfig.findUnique({
        where: { companyId },
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      // Verificar se as credenciais parecem válidas
      if (!config.clientId.includes('.apps.googleusercontent.com')) {
        return res.status(400).json({
          success: false,
          error: 'Client ID inválido. Deve terminar com .apps.googleusercontent.com',
        });
      }

      // Tentar descriptografar o secret para verificar se está válido
      try {
        decrypt(config.clientSecret);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Client Secret inválido ou corrompido',
        });
      }

      res.json({
        success: true,
        message: 'Configuração válida. Os usuários podem conectar suas contas Google.',
        redirectUri: config.redirectUri || this.getDefaultRedirectUri(),
      });
    } catch (error) {
      appLogger.error('Erro ao testar configuração Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao testar configuração' });
    }
  }

  /**
   * Retorna o redirect URI padrão
   */
  private getDefaultRedirectUri(): string {
    const apiUrl = process.env.API_URL || 'https://api.advwell.pro';
    return `${apiUrl}/api/google-calendar/callback`;
  }
}

export default new GoogleCalendarConfigController();
