import { GoogleGenerativeAI } from '@google/generative-ai';
import { appLogger } from '../../../utils/logger';
import { IAIProvider, CaseMovementData, CaseInfo } from '../../../types/ai.types';
import { SYSTEM_PROMPT, generateUserPrompt, formatMovementsForAI } from '../prompts';

/**
 * Google Gemini Provider for AI-powered case summarization
 * Supports: gemini-1.5-pro, gemini-1.5-flash, gemini-pro
 */
export class GeminiProvider implements IAIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  /**
   * @param apiKey - Google AI API key
   * @param model - Model to use (default: gemini-1.5-flash for speed and cost)
   */
  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  /**
   * Generate a summary of case movements
   */
  async generateSummary(movements: CaseMovementData[], caseInfo: CaseInfo): Promise<string> {
    try {
      if (!movements || movements.length === 0) {
        return 'Nenhum andamento processual registrado ainda.';
      }

      // Format movements for AI consumption
      const formattedMovements = formatMovementsForAI(movements);

      // Generate user prompt
      const userPrompt = generateUserPrompt(formattedMovements, caseInfo);

      // Combine system and user prompts for Gemini
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

      // Get the generative model
      const genModel = this.client.getGenerativeModel({ model: this.model });

      // Generate content
      const result = await genModel.generateContent(fullPrompt);
      const response = await result.response;
      const summary = response.text().trim();

      if (!summary) {
        throw new Error('Gemini returned empty response');
      }

      return summary;
    } catch (error: any) {
      appLogger.error('Gemini Provider Error', error as Error);

      // Handle specific Gemini errors
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
        throw new Error('API Key inválida. Verifique sua configuração.');
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      } else if (error.message?.includes('500')) {
        throw new Error('Erro no servidor do Gemini. Tente novamente mais tarde.');
      }

      throw new Error(`Erro ao gerar resumo: ${error.message}`);
    }
  }

  /**
   * Generate text from a custom prompt
   */
  async generateText(prompt: string): Promise<string> {
    try {
      const genModel = this.client.getGenerativeModel({ model: this.model });
      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      if (!text) {
        throw new Error('Gemini returned empty response');
      }

      return text;
    } catch (error: any) {
      appLogger.error('Gemini generateText Error', error as Error);

      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
        throw new Error('API Key inválida. Verifique sua configuração.');
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      }

      throw new Error(`Erro ao gerar texto: ${error.message}`);
    }
  }

  /**
   * Test connection with Gemini API
   */
  async testConnection(): Promise<string> {
    try {
      // Get the generative model
      const genModel = this.client.getGenerativeModel({ model: this.model });

      // Make a simple API call to verify the key works
      const result = await genModel.generateContent('Diga apenas: OK');
      const response = await result.response;
      const text = response.text();

      if (text) {
        return `✅ Conexão com Google Gemini estabelecida com sucesso! Modelo: ${this.model}`;
      }

      throw new Error('Resposta inválida da API');
    } catch (error: any) {
      appLogger.error('Gemini Connection Test Error', error as Error);

      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
        throw new Error('❌ API Key inválida. Verifique sua configuração.');
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        throw new Error('❌ Limite de requisições excedido.');
      }

      throw new Error(`❌ Falha na conexão: ${error.message}`);
    }
  }
}
