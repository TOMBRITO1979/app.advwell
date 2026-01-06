import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { AIService } from '../services/ai/ai.service';
import { appLogger } from '../utils/logger';

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
    appLogger.error('Error fetching AI config:', error as Error);
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
    appLogger.error('Error upserting AI config:', error as Error);
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
    appLogger.error('Error deleting AI config:', error as Error);
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
    appLogger.error('Error testing AI connection:', error as Error);
    res.status(400).json({ error: 'Erro ao testar conexão com IA. Verifique suas credenciais.' });
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
    appLogger.error('Error testing provider connection:', error as Error);
    res.status(400).json({ error: 'Erro ao testar conexão. Verifique o provider e API key.' });
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
    appLogger.error('Error getting available models:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar modelos disponíveis' });
  }
};

/**
 * Get token usage statistics for current company
 * Query params:
 *   - startDate: Start date (ISO string, defaults to 30 days ago)
 *   - endDate: End date (ISO string, defaults to now)
 *   - groupBy: 'day' | 'week' | 'month' (defaults to 'day')
 */
export const getTokenUsageStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Default dates: last 30 days
    const end = endDate ? new Date(String(endDate)) : new Date();
    const start = startDate
      ? new Date(String(startDate))
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all usage records in the period
    const usageRecords = await prisma.aITokenUsage.findMany({
      where: {
        companyId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate totals
    const totals = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      operationCount: usageRecords.length,
    };

    const operationBreakdown: Record<string, {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    }> = {};

    const dailyUsage: Record<string, {
      date: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    }> = {};

    for (const record of usageRecords) {
      // Add to totals
      totals.promptTokens += record.promptTokens;
      totals.completionTokens += record.completionTokens;
      totals.totalTokens += record.totalTokens;

      // Add to operation breakdown
      if (!operationBreakdown[record.operation]) {
        operationBreakdown[record.operation] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0,
        };
      }
      operationBreakdown[record.operation].promptTokens += record.promptTokens;
      operationBreakdown[record.operation].completionTokens += record.completionTokens;
      operationBreakdown[record.operation].totalTokens += record.totalTokens;
      operationBreakdown[record.operation].count += 1;

      // Add to daily usage
      const dateKey = record.createdAt.toISOString().split('T')[0];
      if (!dailyUsage[dateKey]) {
        dailyUsage[dateKey] = {
          date: dateKey,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0,
        };
      }
      dailyUsage[dateKey].promptTokens += record.promptTokens;
      dailyUsage[dateKey].completionTokens += record.completionTokens;
      dailyUsage[dateKey].totalTokens += record.totalTokens;
      dailyUsage[dateKey].count += 1;
    }

    // Get recent operations (last 10)
    const recentOperations = usageRecords.slice(-10).reverse().map(r => ({
      id: r.id,
      operation: r.operation,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      model: r.model,
      provider: r.provider,
      createdAt: r.createdAt,
    }));

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      totals,
      operationBreakdown,
      dailyUsage: Object.values(dailyUsage),
      recentOperations,
    });
  } catch (error) {
    appLogger.error('Error fetching token usage stats:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de uso de tokens' });
  }
};
