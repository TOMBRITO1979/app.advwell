// AI Provider Types
export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'groq';

// AI Configuration Interface (matches Prisma model)
export interface AIConfigData {
  id: string;
  companyId: string;
  provider: AIProviderType;
  apiKey: string;  // Will be encrypted
  model: string;
  enabled: boolean;
  autoSummarize: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Case Movement Interface for summarization
export interface CaseMovementData {
  movementCode: number;
  movementName: string;
  movementDate: Date;
  description?: string | null;
}

// Token usage information
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// AI response with token usage
export interface AIResponse {
  text: string;
  usage?: TokenUsage;
}

// AI Provider Interface - All providers must implement this
export interface IAIProvider {
  /**
   * Generate a summary of case movements in simple, non-technical language
   * @param movements - Array of case movements
   * @param caseInfo - Additional case information (process number, subject, etc)
   * @returns Summary text in Portuguese Brazilian
   */
  generateSummary(movements: CaseMovementData[], caseInfo: CaseInfo): Promise<string>;

  /**
   * Generate a summary of case movements with token usage tracking
   * @param movements - Array of case movements
   * @param caseInfo - Additional case information (process number, subject, etc)
   * @returns Summary text with token usage info
   */
  generateSummaryWithUsage(movements: CaseMovementData[], caseInfo: CaseInfo): Promise<SummaryResponse>;

  /**
   * Generate text from a custom prompt
   * @param prompt - The prompt to send to the AI
   * @returns Generated text
   */
  generateText(prompt: string): Promise<string>;

  /**
   * Generate text from a custom prompt with token usage
   * @param prompt - The prompt to send to the AI
   * @returns Generated text with token usage
   */
  generateTextWithUsage(prompt: string): Promise<AIResponse>;

  /**
   * Test the connection with the AI provider
   * @returns Success message or throws error
   */
  testConnection(): Promise<string>;
}

// Additional case information for context
export interface CaseInfo {
  processNumber: string;
  subject?: string | null;
  court?: string | null;
  clientName?: string;
}

// AI Provider Factory Return Type
export interface AIProviderFactory {
  provider: IAIProvider;
  config: AIConfigData;
}

// Summary response with token usage
export interface SummaryResponse {
  summary: string;
  usage?: TokenUsage;
}

// Summary Generation Result
export interface SummaryResult {
  success: boolean;
  summary?: string;
  error?: string;
  provider?: AIProviderType;
  model?: string;
  usage?: TokenUsage;  // Token usage for tracking
  aiConfigId?: string;  // For linking to AIConfig when saving usage
}
