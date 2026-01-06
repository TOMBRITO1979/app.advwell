import OpenAI from 'openai';
import { appLogger } from '../../../utils/logger';
import { IAIProvider, CaseMovementData, CaseInfo, AIResponse } from '../../../types/ai.types';
import { SYSTEM_PROMPT, generateUserPrompt, formatMovementsForAI } from '../prompts';

/**
 * OpenAI Provider for AI-powered case summarization
 * Supports: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
 */
export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;
  private model: string;

  /**
   * @param apiKey - OpenAI API key
   * @param model - Model to use (default: gpt-4o-mini for cost efficiency)
   */
  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
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

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const summary = response.choices[0]?.message?.content?.trim();

      if (!summary) {
        throw new Error('OpenAI returned empty response');
      }

      return summary;
    } catch (error: any) {
      appLogger.error('OpenAI Provider Error', error as Error);

      // Handle specific OpenAI errors
      if (error.status === 401) {
        throw new Error('API Key inválida. Verifique sua configuração.');
      } else if (error.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      } else if (error.status === 500) {
        throw new Error('Erro no servidor da OpenAI. Tente novamente mais tarde.');
      }

      throw new Error(`Erro ao gerar resumo: ${error.message}`);
    }
  }

  /**
   * Generate text from a custom prompt
   */
  async generateText(prompt: string): Promise<string> {
    const response = await this.generateTextWithUsage(prompt);
    return response.text;
  }

  /**
   * Generate text from a custom prompt with token usage
   */
  async generateTextWithUsage(prompt: string): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const text = response.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new Error('OpenAI returned empty response');
      }

      return {
        text,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      appLogger.error('OpenAI generateText Error', error as Error);

      if (error.status === 401) {
        throw new Error('API Key inválida. Verifique sua configuração.');
      } else if (error.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      }

      throw new Error(`Erro ao gerar texto: ${error.message}`);
    }
  }

  /**
   * Test connection with OpenAI API
   */
  async testConnection(): Promise<string> {
    try {
      // Make a simple API call to verify the key works
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Diga apenas: OK',
          },
        ],
        max_tokens: 10,
      });

      if (response.choices[0]?.message?.content) {
        return `✅ Conexão com OpenAI estabelecida com sucesso! Modelo: ${this.model}`;
      }

      throw new Error('Resposta inválida da API');
    } catch (error: any) {
      appLogger.error('OpenAI Connection Test Error', error as Error);

      if (error.status === 401) {
        throw new Error('❌ API Key inválida. Verifique sua configuração.');
      } else if (error.status === 429) {
        throw new Error('❌ Limite de requisições excedido.');
      }

      throw new Error(`❌ Falha na conexão: ${error.message}`);
    }
  }
}
