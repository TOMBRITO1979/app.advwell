import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import googleCalendarService from '../services/google-calendar.service';
import { appLogger } from '../utils/logger';
import { config } from '../config';

export class GoogleCalendarController {
  /**
   * Verifica se o Google Calendar está configurado para a empresa do usuário
   * GET /api/google-calendar/configured
   */
  async isConfigured(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        return res.json({ configured: false });
      }
      const configured = await googleCalendarService.isConfigured(companyId);
      res.json({ configured });
    } catch (error) {
      appLogger.error('Erro ao verificar configuração do Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao verificar configuração' });
    }
  }

  /**
   * Retorna status da conexão com Google Calendar do usuário
   * GET /api/google-calendar/status
   */
  async getStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const status = await googleCalendarService.getStatus(userId);
      res.json(status);
    } catch (error) {
      appLogger.error('Erro ao buscar status do Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status' });
    }
  }

  /**
   * Gera URL de autorização OAuth
   * GET /api/google-calendar/auth-url
   */
  async getAuthUrl(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        return res.status(403).json({
          error: 'Usuário não possui empresa associada',
        });
      }

      const configured = await googleCalendarService.isConfigured(companyId);
      if (!configured) {
        return res.status(400).json({
          error: 'Google Calendar não está configurado para esta empresa. O administrador precisa configurar as credenciais.',
        });
      }

      const userId = req.user!.userId;
      const authUrl = await googleCalendarService.getAuthUrl(userId);

      res.json({ authUrl });
    } catch (error) {
      appLogger.error('Erro ao gerar URL de autorização', error as Error);
      res.status(500).json({ error: 'Erro ao gerar URL de autorização' });
    }
  }

  /**
   * Processa callback do OAuth do Google
   * GET /api/google-calendar/callback
   * (Sem autenticação - usuário é identificado pelo state)
   */
  async handleCallback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;

      // Verificar se houve erro no OAuth
      if (error) {
        appLogger.warn('OAuth error from Google', { error });
        return res.redirect(
          `${config.urls.frontend}/google-calendar?error=${encodeURIComponent(String(error))}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${config.urls.frontend}/google-calendar?error=missing_params`
        );
      }

      // Processar callback
      const result = await googleCalendarService.handleCallback(
        String(code),
        String(state)
      );

      appLogger.info('Google Calendar conectado via callback', {
        userId: result.userId,
        email: result.email
      });

      // Redirecionar para página de configurações com sucesso
      res.redirect(`${config.urls.frontend}/google-calendar?success=true`);
    } catch (error) {
      appLogger.error('Erro no callback do Google OAuth', error as Error);
      res.redirect(
        `${config.urls.frontend}/google-calendar?error=callback_failed`
      );
    }
  }

  /**
   * Desconecta a conta Google do usuário
   * POST /api/google-calendar/disconnect
   */
  async disconnect(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const success = await googleCalendarService.disconnect(userId);

      if (success) {
        res.json({ message: 'Google Calendar desconectado com sucesso' });
      } else {
        res.status(400).json({ error: 'Nenhuma conta conectada' });
      }
    } catch (error) {
      appLogger.error('Erro ao desconectar Google Calendar', error as Error);
      res.status(500).json({ error: 'Erro ao desconectar' });
    }
  }

  /**
   * Atualiza configurações de sincronização
   * PUT /api/google-calendar/settings
   */
  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { syncEnabled } = req.body;

      if (typeof syncEnabled !== 'boolean') {
        return res.status(400).json({ error: 'syncEnabled deve ser boolean' });
      }

      const success = await googleCalendarService.updateSettings(userId, { syncEnabled });

      if (success) {
        const status = await googleCalendarService.getStatus(userId);
        res.json(status);
      } else {
        res.status(400).json({ error: 'Nenhuma conta conectada' });
      }
    } catch (error) {
      appLogger.error('Erro ao atualizar configurações', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  }
}

export default new GoogleCalendarController();
