/**
 * AI Prompts for Legal Case Summarization
 *
 * This file contains all prompt templates used for AI-powered
 * case movement summarization.
 */

import { CaseInfo } from '../../types/ai.types';

/**
 * System prompt for legal case summarization
 */
export const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em análise processual.
Sua função é transformar andamentos processuais técnicos em resumos claros e acessíveis para clientes.

DIRETRIZES:
1. Use linguagem simples e direta (evite jargões jurídicos)
2. Seja objetivo e conciso (máximo 3-4 linhas)
3. Foque no mais importante e recente
4. Mantenha tom profissional mas acessível
5. Use português brasileiro
6. NÃO invente informações - apenas resuma o que foi fornecido
7. Se houver prazo ou data importante, mencione
8. Se for necessária ação do cliente, destaque`;

/**
 * Generate the user prompt for case movement summarization
 * @param movements - String with all case movements
 * @param caseInfo - Case information for context
 * @returns Formatted prompt for AI
 */
export function generateUserPrompt(movements: string, caseInfo: CaseInfo): string {
  return `Analise os andamentos processuais abaixo e gere um resumo CLARO e OBJETIVO em português brasileiro simples para que o cliente possa entender facilmente o que está acontecendo com seu processo.

📋 INFORMAÇÕES DO PROCESSO:
Número: ${caseInfo.processNumber}
Assunto: ${caseInfo.subject}
Tribunal: ${caseInfo.court}
${caseInfo.clientName ? `Cliente: ${caseInfo.clientName}` : ''}

📝 ANDAMENTOS PROCESSUAIS:
${movements}

INSTRUÇÕES:
- Máximo de 3-4 linhas
- Foque nos andamentos mais recentes e importantes
- Use linguagem acessível (não técnica)
- Se houver prazo ou audiência marcada, mencione a data
- Se for necessária alguma ação do cliente, destaque

Gere apenas o resumo, sem preâmbulos ou explicações adicionais.`;
}

/**
 * Format movements for AI consumption
 * @param movements - Array of movement objects
 * @returns Formatted string of movements
 */
export function formatMovementsForAI(movements: any[]): string {
  return movements
    .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime())
    .slice(0, 10) // Limitar aos 10 movimentos mais recentes para economizar tokens
    .map((m, index) => {
      const date = new Date(m.movementDate).toLocaleDateString('pt-BR');
      return `${index + 1}. [${date}] ${m.movementName}${m.description ? ` - ${m.description}` : ''}`;
    })
    .join('\n');
}
