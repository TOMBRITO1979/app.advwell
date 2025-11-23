import prisma from '../../utils/prisma';
import { decrypt } from '../../utils/encryption';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { IAIProvider, CaseMovementData, CaseInfo, SummaryResult } from '../../types/ai.types';

/**
 * AI Service - Factory for creating AI providers
 *
 * This service handles:
 * - Provider instantiation based on company configuration
 * - API key decryption
 * - Summary generation
 * - Connection testing
 */
export class AIService {
  /**
   * Get AI provider for a company
   * @param companyId - Company ID
   * @returns AI provider instance or null if not configured
   */
  static async getProvider(companyId: string): Promise<IAIProvider | null> {
    try {
      // Fetch AI configuration for company
      const config = await prisma.aIConfig.findUnique({
        where: { companyId },
      });

      if (!config || !config.enabled) {
        return null;
      }

      // Decrypt API key
      const apiKey = decrypt(config.apiKey);

      // Create provider based on type
      switch (config.provider) {
        case 'openai':
          return new OpenAIProvider(apiKey, config.model);

        case 'gemini':
          return new GeminiProvider(apiKey, config.model);

        // Future providers can be added here
        // case 'anthropic':
        //   return new ClaudeProvider(apiKey, config.model);
        //
        // case 'groq':
        //   return new GroqProvider(apiKey, config.model);

        default:
          throw new Error(`Provider não suportado: ${config.provider}`);
      }
    } catch (error) {
      console.error('Error getting AI provider:', error);
      throw error;
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
      // Get AI provider
      const provider = await this.getProvider(companyId);

      if (!provider) {
        return {
          success: false,
          error: 'IA não configurada para esta empresa',
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

      // Generate summary
      const summary = await provider.generateSummary(movements, caseInfo);

      // Get config to determine provider type and model
      const config = await prisma.aIConfig.findUnique({
        where: { companyId },
        select: { provider: true, model: true },
      });

      return {
        success: true,
        summary,
        provider: config?.provider,
        model: config?.model,
      };
    } catch (error: any) {
      console.error('Error generating case summary:', error);
      return {
        success: false,
        error: error.message || 'Erro ao gerar resumo',
      };
    }
  }

  /**
   * Test AI connection for a company
   * @param companyId - Company ID
   * @returns Test result message
   */
  static async testConnection(companyId: string): Promise<string> {
    const provider = await this.getProvider(companyId);

    if (!provider) {
      throw new Error('IA não configurada para esta empresa');
    }

    return await provider.testConnection();
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
    let provider: IAIProvider;

    switch (providerType) {
      case 'openai':
        provider = new OpenAIProvider(apiKey, model);
        break;

      case 'gemini':
        provider = new GeminiProvider(apiKey, model);
        break;

      default:
        throw new Error(`Provider não suportado: ${providerType}`);
    }

    return await provider.testConnection();
  }
}
