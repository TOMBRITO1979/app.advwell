import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';
import { validateBotToken, setWebhook, processIncomingMessage } from '../services/telegram.service';
import { config } from '../config';

/**
 * Buscar configuração do Telegram da empresa
 * GET /api/telegram/config
 */
export const getConfig = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    const config = await prisma.telegramConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      botUsername: config.botUsername,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    appLogger.error('Erro ao buscar config Telegram', error as Error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
};

/**
 * Salvar configuração do Telegram
 * POST /api/telegram/config
 */
export const saveConfig = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { botToken, isActive } = req.body;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    if (!botToken) {
      return res.status(400).json({ error: 'Token do bot é obrigatório' });
    }

    // Validar token testando a API
    const validation = await validateBotToken(botToken);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Token do bot inválido' });
    }

    // Configurar webhook para o bot responder /start
    const webhookUrl = `${config.urls.api}/api/telegram/webhook/${companyId}`;
    const webhookResult = await setWebhook(botToken, webhookUrl);
    if (!webhookResult.success) {
      appLogger.warn('Falha ao configurar webhook Telegram', { companyId, error: webhookResult.error });
      // Não bloquear salvamento por causa do webhook
    }

    const savedConfig = await prisma.telegramConfig.upsert({
      where: { companyId },
      update: {
        botToken: encrypt(botToken),
        botUsername: validation.username ? `@${validation.username}` : null,
        isActive: isActive ?? true,
      },
      create: {
        companyId,
        botToken: encrypt(botToken),
        botUsername: validation.username ? `@${validation.username}` : null,
        isActive: isActive ?? true,
      },
    });

    appLogger.info('Configuração Telegram salva', {
      companyId,
      botUsername: savedConfig.botUsername,
      webhookConfigured: webhookResult.success
    });

    res.json({
      configured: true,
      botUsername: savedConfig.botUsername,
      isActive: savedConfig.isActive,
      webhookConfigured: webhookResult.success,
    });
  } catch (error) {
    appLogger.error('Erro ao salvar config Telegram', error as Error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
};

/**
 * Ativar/Desativar Telegram
 * PUT /api/telegram/toggle
 */
export const toggleActive = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { isActive } = req.body;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    const config = await prisma.telegramConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.status(404).json({ error: 'Telegram não configurado' });
    }

    const updated = await prisma.telegramConfig.update({
      where: { companyId },
      data: { isActive: isActive ?? !config.isActive },
    });

    appLogger.info('Telegram status alterado', { companyId, isActive: updated.isActive });

    res.json({
      isActive: updated.isActive,
      message: updated.isActive ? 'Telegram ativado' : 'Telegram desativado',
    });
  } catch (error) {
    appLogger.error('Erro ao alterar status Telegram', error as Error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
};

/**
 * Testar envio de mensagem
 * POST /api/telegram/test
 */
export const testMessage = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { chatId } = req.body;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID é obrigatório' });
    }

    const { getTelegramConfig, sendTelegramMessage } = await import('../services/telegram.service');

    const config = await getTelegramConfig(companyId);
    if (!config) {
      return res.status(400).json({ error: 'Telegram não configurado ou inativo' });
    }

    const success = await sendTelegramMessage(config.botToken, {
      chatId,
      text: '✅ <b>Teste de conexão</b>\n\nSua integração com Telegram está funcionando corretamente!',
    });

    if (success) {
      res.json({ success: true, message: 'Mensagem de teste enviada com sucesso' });
    } else {
      res.status(400).json({ error: 'Falha ao enviar mensagem. Verifique o Chat ID.' });
    }
  } catch (error) {
    appLogger.error('Erro ao enviar teste Telegram', error as Error);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
};

/**
 * Webhook para receber mensagens do Telegram
 * POST /api/telegram/webhook/:companyId
 * Este endpoint é público (sem autenticação) pois é chamado pelo Telegram
 */
export const webhook = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const update = req.body;

    // Responder imediatamente ao Telegram
    res.status(200).json({ ok: true });

    // Validar se é uma mensagem de texto
    if (!update?.message?.text || !update?.message?.chat?.id) {
      return;
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text;
    const firstName = update.message.from?.first_name || '';

    // Buscar config da empresa
    const telegramConfig = await prisma.telegramConfig.findUnique({
      where: { companyId },
    });

    if (!telegramConfig || !telegramConfig.isActive) {
      appLogger.warn('Webhook recebido para empresa sem Telegram configurado', { companyId });
      return;
    }

    // Descriptografar token e processar mensagem
    const botToken = decrypt(telegramConfig.botToken);
    await processIncomingMessage(botToken, chatId, text, firstName);

    appLogger.info('Webhook Telegram processado', { companyId, chatId });
  } catch (error) {
    appLogger.error('Erro ao processar webhook Telegram', error as Error);
    // Não retornar erro para o Telegram
  }
};

/**
 * Webhook do bot PADRÃO do sistema
 * POST /api/telegram/webhook/system
 */
export const systemWebhook = async (req: Request, res: Response) => {
  try {
    const update = req.body;

    // Responder imediatamente ao Telegram
    res.status(200).json({ ok: true });

    // Validar se é uma mensagem de texto
    if (!update?.message?.text || !update?.message?.chat?.id) {
      return;
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text;
    const firstName = update.message.from?.first_name || '';

    if (!config.telegram.defaultBotToken) {
      appLogger.warn('Webhook system recebido mas bot padrão não configurado');
      return;
    }

    await processIncomingMessage(
      config.telegram.defaultBotToken,
      chatId,
      text,
      firstName
    );

    appLogger.info('Webhook Telegram (bot padrão) processado', { chatId });
  } catch (error) {
    appLogger.error('Erro webhook Telegram padrão', error as Error);
    // Não retornar erro para o Telegram
  }
};

export default { getConfig, saveConfig, toggleActive, testMessage, webhook, systemWebhook };
