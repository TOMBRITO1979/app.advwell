import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { AIService } from '../services/ai/ai.service';

/**
 * AI Configuration Controller
 *
 * Handles CRUD operations for AI configuration
 * Restricted to ADMIN and SUPER_ADMIN roles
 */

/**
 * Get AI configuration for current company
 */
export const getConfig = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;

    const config = await prisma.aIConfig.findUnique({
      where: { companyId },
      select: {
        id: true,
        provider: true,
        model: true,
        enabled: true,
        autoSummarize: true,
        createdAt: true,
        updatedAt: true,
        // API Key NOT included for security
      },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuração de IA não encontrada' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de IA' });
  }
};

/**
 * Create or update AI configuration for current company
 */
export const upsertConfig = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { provider, apiKey, model, enabled, autoSummarize } = req.body;

    // Validate required fields
    if (!provider || !apiKey || !model) {
      return res.status(400).json({
        error: 'Campos obrigatórios: provider, apiKey, model',
      });
    }

    // Validate provider
    const validProviders = ['openai', 'gemini', 'anthropic', 'groq'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `Provider inválido. Valores aceitos: ${validProviders.join(', ')}`,
      });
    }

    // Encrypt API key
    const encryptedApiKey = encrypt(apiKey);

    // Upsert configuration
    const config = await prisma.aIConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        provider,
        apiKey: encryptedApiKey,
        model,
        enabled: enabled !== undefined ? enabled : true,
        autoSummarize: autoSummarize !== undefined ? autoSummarize : true,
      },
      update: {
        provider,
        apiKey: encryptedApiKey,
        model,
        enabled: enabled !== undefined ? enabled : undefined,
        autoSummarize: autoSummarize !== undefined ? autoSummarize : undefined,
      },
      select: {
        id: true,
        provider: true,
        model: true,
        enabled: true,
        autoSummarize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Configuração de IA salva com sucesso',
      config,
    });
  } catch (error) {
    console.error('Error upserting AI config:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração de IA' });
  }
};

/**
 * Delete AI configuration for current company
 */
export const deleteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;

    const config = await prisma.aIConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuração de IA não encontrada' });
    }

    await prisma.aIConfig.delete({
      where: { companyId },
    });

    res.json({ message: 'Configuração de IA removida com sucesso' });
  } catch (error) {
    console.error('Error deleting AI config:', error);
    res.status(500).json({ error: 'Erro ao remover configuração de IA' });
  }
};

/**
 * Test AI connection for current company
 */
export const testConnection = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;

    const message = await AIService.testConnection(companyId);

    res.json({ message });
  } catch (error: any) {
    console.error('Error testing AI connection:', error);
    res.status(400).json({ error: error.message || 'Erro ao testar conexão com IA' });
  }
};

/**
 * Test specific provider connection (for setup wizard)
 * Does NOT require existing configuration
 */
export const testProviderConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { provider, apiKey, model } = req.body;

    if (!provider || !apiKey || !model) {
      return res.status(400).json({
        error: 'Campos obrigatórios: provider, apiKey, model',
      });
    }

    const message = await AIService.testProviderConnection(provider, apiKey, model);

    res.json({ message });
  } catch (error: any) {
    console.error('Error testing provider connection:', error);
    res.status(400).json({ error: error.message || 'Erro ao testar conexão' });
  }
};

/**
 * Get available AI models for each provider
 */
export const getAvailableModels = async (req: AuthRequest, res: Response) => {
  try {
    const models = {
      openai: [
        { value: 'gpt-4o', label: 'GPT-4o (Mais recente, rápido e barato)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o-mini (Mais barato, recomendado)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Mais barato)' },
      ],
      gemini: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Melhor qualidade)' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Rápido e grátis, recomendado)' },
        { value: 'gemini-pro', label: 'Gemini Pro' },
      ],
      anthropic: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Melhor)' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      ],
      groq: [
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Rápido)' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Muito rápido)' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      ],
    };

    res.json(models);
  } catch (error) {
    console.error('Error getting available models:', error);
    res.status(500).json({ error: 'Erro ao buscar modelos disponíveis' });
  }
};
