import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';
import { ScheduleEvent, ScheduleEventType, Priority } from '@prisma/client';

// Scopes necessários para Google Calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Interface para credenciais da empresa
interface CompanyGoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Criar cliente OAuth2 com credenciais da empresa
function createOAuth2Client(credentials: CompanyGoogleCredentials): OAuth2Client {
  return new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri
  );
}

// Obter companyId do usuário
async function getCompanyIdFromUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return user?.companyId || null;
}

// Obter redirect URI padrão
function getDefaultRedirectUri(): string {
  const apiUrl = process.env.API_URL || 'https://api.advwell.pro';
  return `${apiUrl}/api/google-calendar/callback`;
}

// Interface para representar dados de evento simplificados
interface EventData {
  id: string;
  title: string;
  description?: string | null;
  date: Date;
  endDate?: Date | null;
  type: ScheduleEventType;
  priority: Priority;
  googleMeetLink?: string | null;
}

class GoogleCalendarService {
  /**
   * Obtém credenciais do Google Calendar da empresa
   * @param companyId ID da empresa
   */
  async getCompanyCredentials(companyId: string): Promise<CompanyGoogleCredentials | null> {
    const config = await prisma.googleCalendarCompanyConfig.findUnique({
      where: { companyId },
    });

    if (!config || !config.isActive) {
      return null;
    }

    return {
      clientId: config.clientId,
      clientSecret: decrypt(config.clientSecret),
      redirectUri: config.redirectUri || getDefaultRedirectUri(),
    };
  }

  /**
   * Verifica se o Google Calendar está configurado para a empresa
   * @param companyId ID da empresa
   */
  async isConfigured(companyId: string): Promise<boolean> {
    const credentials = await this.getCompanyCredentials(companyId);
    return credentials !== null;
  }

  /**
   * Gera URL de autorização OAuth para conectar Google Calendar
   * @param userId ID do usuário
   * @param state State parameter para validação CSRF
   */
  async getAuthUrl(userId: string, state?: string): Promise<string> {
    const companyId = await getCompanyIdFromUser(userId);
    if (!companyId) {
      throw new Error('Usuário não possui empresa associada');
    }

    const credentials = await this.getCompanyCredentials(companyId);
    if (!credentials) {
      throw new Error('Google Calendar não está configurado para esta empresa');
    }

    const oauth2Client = createOAuth2Client(credentials);

    // Incluir userId e companyId no state para identificar no callback
    const stateData = JSON.stringify({ userId, companyId, nonce: state || Date.now().toString() });
    const encodedState = Buffer.from(stateData).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Necessário para obter refresh token
      scope: SCOPES,
      state: encodedState,
      prompt: 'consent', // Força exibir tela de consentimento para garantir refresh token
    });

    return authUrl;
  }

  /**
   * Processa callback do OAuth e salva tokens
   * @param code Código de autorização do Google
   * @param state State parameter para validação
   */
  async handleCallback(code: string, state: string): Promise<{ userId: string; email: string }> {
    // Decodificar state para obter userId e companyId
    let stateData: { userId: string; companyId: string; nonce: string };
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf-8');
      stateData = JSON.parse(decodedState);
    } catch (error) {
      appLogger.error('Erro ao decodificar state do OAuth', error as Error);
      throw new Error('State inválido');
    }

    const credentials = await this.getCompanyCredentials(stateData.companyId);
    if (!credentials) {
      throw new Error('Google Calendar não está configurado para esta empresa');
    }

    const oauth2Client = createOAuth2Client(credentials);

    // Trocar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Tokens não retornados pelo Google');
    }

    // Obter email da conta Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      throw new Error('Email não retornado pelo Google');
    }

    // Calcular data de expiração
    const tokenExpiry = new Date(tokens.expiry_date || Date.now() + 3600000);

    // Criptografar tokens antes de salvar
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Salvar ou atualizar configuração
    await prisma.googleCalendarConfig.upsert({
      where: { userId: stateData.userId },
      create: {
        userId: stateData.userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        email,
        enabled: true,
        syncEnabled: true,
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        email,
        enabled: true,
      },
    });

    appLogger.info('Google Calendar conectado', { userId: stateData.userId, email });

    return { userId: stateData.userId, email };
  }

  /**
   * Renova o access token se estiver expirado
   * @param userId ID do usuário
   */
  async refreshTokenIfNeeded(userId: string): Promise<OAuth2Client | null> {
    const gcConfig = await prisma.googleCalendarConfig.findUnique({
      where: { userId },
      include: { user: { select: { companyId: true } } },
    });

    if (!gcConfig || !gcConfig.enabled) {
      return null;
    }

    const companyId = gcConfig.user.companyId;
    if (!companyId) {
      return null;
    }

    const credentials = await this.getCompanyCredentials(companyId);
    if (!credentials) {
      return null;
    }

    const oauth2Client = createOAuth2Client(credentials);

    // Descriptografar tokens
    const accessToken = decrypt(gcConfig.accessToken);
    const refreshToken = decrypt(gcConfig.refreshToken);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: gcConfig.tokenExpiry.getTime(),
    });

    // Verificar se precisa renovar (5 minutos antes de expirar)
    const now = Date.now();
    const expiryTime = gcConfig.tokenExpiry.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (now >= expiryTime - fiveMinutes) {
      try {
        appLogger.info('Renovando access token do Google Calendar', { userId });

        const { credentials } = await oauth2Client.refreshAccessToken();

        // Atualizar tokens no banco
        await prisma.googleCalendarConfig.update({
          where: { userId },
          data: {
            accessToken: encrypt(credentials.access_token!),
            tokenExpiry: new Date(credentials.expiry_date || Date.now() + 3600000),
          },
        });

        oauth2Client.setCredentials(credentials);
      } catch (error) {
        appLogger.error('Erro ao renovar token do Google Calendar', error as Error);

        // Se falhar ao renovar, desabilitar a integração
        await prisma.googleCalendarConfig.update({
          where: { userId },
          data: { enabled: false },
        });

        return null;
      }
    }

    return oauth2Client;
  }

  /**
   * Cria um evento no Google Calendar
   * @param userId ID do usuário
   * @param event Dados do evento do AdvWell
   */
  async createEvent(userId: string, event: EventData): Promise<string | null> {
    const oauth2Client = await this.refreshTokenIfNeeded(userId);
    if (!oauth2Client) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Mapear tipo de evento para cor do Google Calendar
    const colorId = this.getColorIdForEventType(event.type);

    // Calcular data de término (padrão: 1 hora após início)
    const startDate = new Date(event.date);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    // Construir descrição com link do Google Meet se houver
    let description = event.description || '';
    if (event.googleMeetLink) {
      description += `\n\nGoogle Meet: ${event.googleMeetLink}`;
    }
    description += '\n\n---\nEvento criado pelo AdvWell';

    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: description.trim(),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId,
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });

      appLogger.info('Evento criado no Google Calendar', {
        userId,
        advwellEventId: event.id,
        googleEventId: response.data.id,
      });

      return response.data.id || null;
    } catch (error) {
      appLogger.error('Erro ao criar evento no Google Calendar', error as Error);
      return null;
    }
  }

  /**
   * Atualiza um evento no Google Calendar
   * @param userId ID do usuário
   * @param googleEventId ID do evento no Google
   * @param event Dados atualizados do evento
   */
  async updateEvent(userId: string, googleEventId: string, event: EventData): Promise<boolean> {
    const oauth2Client = await this.refreshTokenIfNeeded(userId);
    if (!oauth2Client) {
      return false;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const colorId = this.getColorIdForEventType(event.type);

    const startDate = new Date(event.date);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    let description = event.description || '';
    if (event.googleMeetLink) {
      description += `\n\nGoogle Meet: ${event.googleMeetLink}`;
    }
    description += '\n\n---\nEvento atualizado pelo AdvWell';

    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: description.trim(),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId,
    };

    try {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: googleEvent,
      });

      appLogger.info('Evento atualizado no Google Calendar', {
        userId,
        advwellEventId: event.id,
        googleEventId,
      });

      return true;
    } catch (error) {
      appLogger.error('Erro ao atualizar evento no Google Calendar', error as Error);
      return false;
    }
  }

  /**
   * Remove um evento do Google Calendar
   * @param userId ID do usuário
   * @param googleEventId ID do evento no Google
   */
  async deleteEvent(userId: string, googleEventId: string): Promise<boolean> {
    const oauth2Client = await this.refreshTokenIfNeeded(userId);
    if (!oauth2Client) {
      return false;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });

      appLogger.info('Evento removido do Google Calendar', {
        userId,
        googleEventId,
      });

      return true;
    } catch (error) {
      appLogger.error('Erro ao remover evento do Google Calendar', error as Error);
      return false;
    }
  }

  /**
   * Desconecta a conta Google do usuário
   * @param userId ID do usuário
   */
  async disconnect(userId: string): Promise<boolean> {
    const gcConfig = await prisma.googleCalendarConfig.findUnique({
      where: { userId },
      include: { user: { select: { companyId: true } } },
    });

    if (!gcConfig) {
      return false;
    }

    try {
      // Tentar revogar o token no Google
      const companyId = gcConfig.user.companyId;
      const credentials = companyId ? await this.getCompanyCredentials(companyId) : null;

      if (credentials) {
        const oauth2Client = createOAuth2Client(credentials);
        const accessToken = decrypt(gcConfig.accessToken);

        try {
          await oauth2Client.revokeToken(accessToken);
        } catch (revokeError) {
          // Ignorar erro de revogação (token pode já estar expirado/revogado)
          appLogger.warn('Erro ao revogar token do Google (ignorando)', revokeError);
        }
      }

      // Remover configuração do banco
      await prisma.googleCalendarConfig.delete({
        where: { userId },
      });

      appLogger.info('Google Calendar desconectado', { userId });

      return true;
    } catch (error) {
      appLogger.error('Erro ao desconectar Google Calendar', error as Error);
      return false;
    }
  }

  /**
   * Retorna status da conexão com Google Calendar
   * @param userId ID do usuário
   */
  async getStatus(userId: string): Promise<{
    connected: boolean;
    email?: string;
    syncEnabled?: boolean;
    enabled?: boolean;
  }> {
    const gcConfig = await prisma.googleCalendarConfig.findUnique({
      where: { userId },
    });

    if (!gcConfig) {
      return { connected: false };
    }

    return {
      connected: true,
      email: gcConfig.email,
      syncEnabled: gcConfig.syncEnabled,
      enabled: gcConfig.enabled,
    };
  }

  /**
   * Atualiza configurações de sincronização
   * @param userId ID do usuário
   * @param settings Configurações a atualizar
   */
  async updateSettings(userId: string, settings: { syncEnabled?: boolean }): Promise<boolean> {
    try {
      await prisma.googleCalendarConfig.update({
        where: { userId },
        data: settings,
      });

      appLogger.info('Configurações do Google Calendar atualizadas', { userId, settings });

      return true;
    } catch (error) {
      appLogger.error('Erro ao atualizar configurações do Google Calendar', error as Error);
      return false;
    }
  }

  /**
   * Mapeia tipo de evento para cor do Google Calendar
   * Google Calendar usa IDs numéricos para cores (1-11)
   */
  private getColorIdForEventType(type: ScheduleEventType): string {
    const colorMap: Record<ScheduleEventType, string> = {
      COMPROMISSO: '1',  // Azul lavanda
      TAREFA: '2',       // Sálvia (verde claro)
      PRAZO: '11',       // Vermelho
      AUDIENCIA: '5',    // Amarelo
      PERICIA: '6',      // Laranja
      GOOGLE_MEET: '7',  // Turquesa
    };

    return colorMap[type] || '1';
  }

  /**
   * Verifica se um usuário tem sincronização habilitada
   * @param userId ID do usuário
   */
  async isSyncEnabled(userId: string): Promise<boolean> {
    const gcConfig = await prisma.googleCalendarConfig.findUnique({
      where: { userId },
      select: { enabled: true, syncEnabled: true },
    });

    return !!(gcConfig?.enabled && gcConfig?.syncEnabled);
  }
}

export default new GoogleCalendarService();
