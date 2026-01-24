import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';
import { validateBotToken } from '../services/telegram.service';

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

    const config = await prisma.telegramConfig.upsert({
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

    appLogger.info('Configuração Telegram salva', { companyId, botUsername: config.botUsername });

    res.json({
      configured: true,
      botUsername: config.botUsername,
      isActive: config.isActive,
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

export default { getConfig, saveConfig, toggleActive, testMessage };
