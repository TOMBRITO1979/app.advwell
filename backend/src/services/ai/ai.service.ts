import prisma from '../../utils/prisma';
import { decrypt } from '../../utils/encryption';
import { appLogger } from '../../utils/logger';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { IAIProvider, CaseMovementData, CaseInfo, SummaryResult, TokenUsage } from '../../types/ai.types';

/**
 * AI Provider Context - includes provider instance and config info
 */
interface AIProviderContext {
  provider: IAIProvider;
  aiConfigId: string;
  providerType: string;
  model: string;
  isShared: boolean;
  shareId?: string;
  tokenLimit?: number;
  tokensUsed?: number;
}

/**
 * AI Service - Factory for creating AI providers
 *
 * This service handles:
 * - Provider instantiation based on company configuration
 * - Shared token support (one company can share AI access with others)
 * - API key decryption
 * - Summary generation
 * - Token usage tracking for shared access
 * - Connection testing
 */
export class AIService {
  /**
   * Get AI provider context for a company
   * First checks for own config, then checks for shared access
   * @param companyId - Company ID
   * @returns AI provider context or null if not configured
   */
  static async getProviderContext(companyId: string): Promise<AIProviderContext | null> {
    try {
      // 1. First, check if company has their own AI config
      const ownConfig = await prisma.aIConfig.findUnique({
        where: { companyId },
      });

      if (ownConfig && ownConfig.enabled) {
        const apiKey = decrypt(ownConfig.apiKey);
        const provider = this.createProvider(ownConfig.provider, apiKey, ownConfig.model);

        return {
          provider,
          aiConfigId: ownConfig.id,
          providerType: ownConfig.provider,
          model: ownConfig.model,
          isShared: false,
        };
      }

      // 2. If no own config, check for shared access
      const sharedAccess = await prisma.aITokenShare.findFirst({
        where: {
          clientCompanyId: companyId,
          enabled: true,
        },
        include: {
          providerCompany: {
            include: {
              aiConfig: true,
            },
          },
        },
      });

      if (!sharedAccess) {
        return null;
      }

      // Check if provider company has AI config
      const providerConfig = sharedAccess.providerCompany.aiConfig;
      if (!providerConfig || !providerConfig.enabled) {
        return null;
      }

      // Check if client has exceeded their token limit
      if (sharedAccess.tokensUsed >= sharedAccess.tokenLimit) {
        throw new Error('LIMIT_EXCEEDED:Limite de tokens atingido. Entre em contato com o administrador para recarregar.');
      }

      const apiKey = decrypt(providerConfig.apiKey);
      const provider = this.createProvider(providerConfig.provider, apiKey, providerConfig.model);

      return {
        provider,
        aiConfigId: providerConfig.id,
        providerType: providerConfig.provider,
        model: providerConfig.model,
        isShared: true,
        shareId: sharedAccess.id,
        tokenLimit: sharedAccess.tokenLimit,
        tokensUsed: sharedAccess.tokensUsed,
      };
    } catch (error: any) {
      if (error.message?.startsWith('LIMIT_EXCEEDED:')) {
        throw error;
      }
      appLogger.error('Error getting AI provider context', error as Error);
      throw error;
    }
  }

  /**
   * Create provider instance based on type
   */
  private static createProvider(providerType: string, apiKey: string, model: string): IAIProvider {
    switch (providerType) {
      case 'openai':
        return new OpenAIProvider(apiKey, model);
      case 'gemini':
        return new GeminiProvider(apiKey, model);
      default:
        throw new Error(`Provider não suportado: ${providerType}`);
    }
  }

  /**
   * Get AI provider for a company (legacy method for backwards compatibility)
   * @param companyId - Company ID
   * @returns AI provider instance or null if not configured
   */
  static async getProvider(companyId: string): Promise<IAIProvider | null> {
    const context = await this.getProviderContext(companyId);
    return context?.provider || null;
  }

  /**
   * Update shared token usage
   * @param shareId - Share ID
   * @param tokensUsed - Number of tokens used
   */
  static async updateSharedUsage(shareId: string, tokensUsed: number): Promise<void> {
    try {
      const share = await prisma.aITokenShare.update({
        where: { id: shareId },
        data: {
          tokensUsed: { increment: tokensUsed },
          updatedAt: new Date(),
        },
      });

      // Check thresholds for notifications
      const percentUsed = (share.tokensUsed / share.tokenLimit) * 100;

      // Mark 80% notification if reached
      if (percentUsed >= 80 && !share.notifiedAt80) {
        await prisma.aITokenShare.update({
          where: { id: shareId },
          data: { notifiedAt80: true },
        });
        appLogger.info('AI token share reached 80%', { shareId, tokensUsed: share.tokensUsed, tokenLimit: share.tokenLimit });
      }

      // Mark 100% notification if reached
      if (percentUsed >= 100 && !share.notifiedAt100) {
        await prisma.aITokenShare.update({
          where: { id: shareId },
          data: { notifiedAt100: true },
        });
        appLogger.info('AI token share reached 100%', { shareId, tokensUsed: share.tokensUsed, tokenLimit: share.tokenLimit });
      }
    } catch (error) {
      appLogger.error('Error updating shared token usage', error as Error);
      // Don't throw - don't fail the main operation due to usage tracking failure
    }
  }

  /**
   * Generate summary for a case
   * @param caseId - Case ID
   * @param companyId - Company ID
   * @returns Summary result with success status
   */
  static async generateCaseSummary(caseId: string, companyId: string): Promise<SummaryResult> {
    try {
      // Get AI provider context
      let context: AIProviderContext | null;
      try {
        context = await this.getProviderContext(companyId);
      } catch (error: any) {
        if (error.message?.startsWith('LIMIT_EXCEEDED:')) {
          return {
            success: false,
            error: error.message.replace('LIMIT_EXCEEDED:', ''),
          };
        }
        throw error;
      }

      if (!context) {
        return {
          success: false,
          error: 'IA não configurada para esta empresa. Configure sua própria chave API ou solicite acesso compartilhado.',
        };
      }

      // Fetch case with movements
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          movements: {
            orderBy: { movementDate: 'desc' },
          },
          client: {
            select: { name: true },
          },
        },
      });

      if (!caseData) {
        return {
          success: false,
          error: 'Processo não encontrado',
        };
      }

      // Prepare case info
      const caseInfo: CaseInfo = {
        processNumber: caseData.processNumber,
        subject: caseData.subject,
        court: caseData.court,
        clientName: caseData.client?.name,
      };

      // Prepare movements
      const movements: CaseMovementData[] = caseData.movements.map((m) => ({
        movementCode: m.movementCode,
        movementName: m.movementName,
        movementDate: m.movementDate,
        description: m.description,
      }));

      // Generate summary with usage tracking
      const result = await context.provider.generateSummaryWithUsage(movements, caseInfo);

      // If using shared tokens, update the usage
      if (context.isShared && context.shareId && result.usage) {
        await this.updateSharedUsage(context.shareId, result.usage.totalTokens);
      }

      return {
        success: true,
        summary: result.summary,
        provider: context.providerType as any,
        model: context.model,
        usage: result.usage,
        aiConfigId: context.aiConfigId,
      };
    } catch (error: any) {
      appLogger.error('Error generating case summary', error as Error);
      return {
        success: false,
        error: error.message || 'Erro ao gerar resumo',
      };
    }
  }

  /**
   * Check if company can use AI (has own config or shared access with available tokens)
   * @param companyId - Company ID
   * @returns Object with canUse flag and details
   */
  static async checkAIAccess(companyId: string): Promise<{
    canUse: boolean;
    hasOwnConfig: boolean;
    hasSharedAccess: boolean;
    tokensRemaining?: number;
    tokenLimit?: number;
    error?: string;
  }> {
    try {
      // Check own config
      const ownConfig = await prisma.aIConfig.findUnique({
        where: { companyId },
      });

      if (ownConfig && ownConfig.enabled) {
        return {
          canUse: true,
          hasOwnConfig: true,
          hasSharedAccess: false,
        };
      }

      // Check shared access
      const sharedAccess = await prisma.aITokenShare.findFirst({
        where: {
          clientCompanyId: companyId,
          enabled: true,
        },
      });

      if (!sharedAccess) {
        return {
          canUse: false,
          hasOwnConfig: false,
          hasSharedAccess: false,
          error: 'Nenhuma configuração de IA disponível',
        };
      }

      const tokensRemaining = Math.max(0, sharedAccess.tokenLimit - sharedAccess.tokensUsed);

      if (tokensRemaining === 0) {
        return {
          canUse: false,
          hasOwnConfig: false,
          hasSharedAccess: true,
          tokensRemaining: 0,
          tokenLimit: sharedAccess.tokenLimit,
          error: 'Limite de tokens atingido. Solicite recarga ao administrador.',
        };
      }

      return {
        canUse: true,
        hasOwnConfig: false,
        hasSharedAccess: true,
        tokensRemaining,
        tokenLimit: sharedAccess.tokenLimit,
      };
    } catch (error) {
      appLogger.error('Error checking AI access', error as Error);
      return {
        canUse: false,
        hasOwnConfig: false,
        hasSharedAccess: false,
        error: 'Erro ao verificar acesso à IA',
      };
    }
  }

  /**
   * Test AI connection for a company
   * @param companyId - Company ID
   * @returns Test result message
   */
  static async testConnection(companyId: string): Promise<string> {
    const context = await this.getProviderContext(companyId);

    if (!context) {
      throw new Error('IA não configurada para esta empresa');
    }

    const result = await context.provider.testConnection();

    if (context.isShared) {
      const remaining = context.tokenLimit! - context.tokensUsed!;
      return `${result}\n📊 Acesso compartilhado: ${remaining.toLocaleString()} tokens restantes de ${context.tokenLimit!.toLocaleString()}`;
    }

    return result;
  }

  /**
   * Test connection with specific provider and API key (for setup)
   * @param providerType - Provider type (openai, gemini, etc)
   * @param apiKey - API key to test
   * @param model - Model to use
   * @returns Test result message
   */
  static async testProviderConnection(
    providerType: string,
    apiKey: string,
    model: string
  ): Promise<string> {
    const provider = this.createProvider(providerType, apiKey, model);
    return await provider.testConnection();
  }
}
