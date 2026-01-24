import { appLogger } from '../utils/logger';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

interface TelegramConfig {
  botToken: string;
  isActive: boolean;
}

/**
 * Busca configuração do Telegram da empresa
 */
export async function getTelegramConfig(companyId: string): Promise<TelegramConfig | null> {
  try {
    const config = await prisma.telegramConfig.findUnique({
      where: { companyId },
    });

    if (!config || !config.isActive) {
      return null;
    }

    return {
      botToken: decrypt(config.botToken),
      isActive: config.isActive,
    };
  } catch (error) {
    appLogger.error('Erro ao buscar config Telegram', error as Error);
    return null;
  }
}

/**
 * Envia mensagem via Telegram
 */
export async function sendTelegramMessage(
  botToken: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode || 'HTML',
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string; error_code?: number };

    if (!data.ok) {
      appLogger.error('Erro ao enviar mensagem Telegram', new Error(data.description || 'Unknown error'), {
        chatId: message.chatId,
        errorCode: data.error_code,
      });
      return false;
    }

    appLogger.info('Mensagem Telegram enviada', { chatId: message.chatId });
    return true;
  } catch (error) {
    appLogger.error('Erro ao enviar mensagem Telegram', error as Error);
    return false;
  }
}

/**
 * Formata notificação de evento para usuário interno
 */
export function formatEventNotificationForUser(
  eventTitle: string,
  eventDate: Date,
  eventType: string,
  companyName: string
): string {
  const dateStr = eventDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const typeLabels: Record<string, string> = {
    COMPROMISSO: 'Compromisso',
    AUDIENCIA: 'Audiência',
    TAREFA: 'Tarefa',
    PRAZO: 'Prazo',
    GOOGLE_MEET: 'Reunião Online',
    OUTRO: 'Evento',
  };

  return `
<b>📅 Novo ${typeLabels[eventType] || 'Evento'} Atribuído</b>

<b>Título:</b> ${escapeHtml(eventTitle)}
<b>Data:</b> ${dateStr}
<b>Empresa:</b> ${escapeHtml(companyName)}

Acesse o sistema para mais detalhes.
  `.trim();
}

/**
 * Formata notificação de evento para cliente
 */
export function formatEventNotificationForClient(
  eventTitle: string,
  eventDate: Date,
  companyName: string
): string {
  const dateStr = eventDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<b>📅 Lembrete de Compromisso</b>

Olá! Você tem um compromisso agendado:

<b>Assunto:</b> ${escapeHtml(eventTitle)}
<b>Data:</b> ${dateStr}
<b>Com:</b> ${escapeHtml(companyName)}

Em caso de dúvidas, entre em contato conosco.
  `.trim();
}

/**
 * Escapa caracteres especiais do HTML para Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Valida token do bot testando a API
 */
export async function validateBotToken(botToken: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json() as { ok: boolean; description?: string; result?: { username: string } };

    if (!data.ok) {
      return { valid: false, error: data.description || 'Token inválido' };
    }

    return { valid: true, username: data.result?.username };
  } catch (error) {
    return { valid: false, error: 'Erro ao conectar com a API do Telegram' };
  }
}

export default {
  getTelegramConfig,
  sendTelegramMessage,
  formatEventNotificationForUser,
  formatEventNotificationForClient,
  validateBotToken,
};
