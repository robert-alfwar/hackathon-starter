import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry } from 'ai';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import { LLMProviderConfig, LLMProviderError } from './types';

// Load environment variables
dotenv.config();

export class LLMProviderManager {
  private static instance: LLMProviderManager;
  private registry: ReturnType<typeof createProviderRegistry>;

  private constructor() {
    this.registry = this.createRegistry();
  }

  public static getInstance(): LLMProviderManager {
    if (!LLMProviderManager.instance) {
      LLMProviderManager.instance = new LLMProviderManager();
    }
    return LLMProviderManager.instance;
  }

  private createRegistry() {
    const providers: Record<string, any> = {};

    // OpenAI Provider
    if (process.env.OPENAI_API_KEY) {
      providers.openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
      });
    }

    // LM Studio Provider (OpenAI-compatible)
    if (process.env.LMSTUDIO_BASE_URL) {
      providers.lmstudio = createOpenAICompatible({
        name: 'lmstudio',
        apiKey: process.env.LMSTUDIO_API_KEY || 'not-needed',
        baseURL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
      });
    }

    if (Object.keys(providers).length === 0) {
      throw new LLMProviderError(
        'No LLM providers configured. Please check your environment variables.',
        'none'
      );
    }

    return createProviderRegistry(providers);
  }

  public getModel(config?: Partial<LLMProviderConfig>) {
    const provider = config?.provider || process.env.LLM_PROVIDER || 'openai';
    const model = config?.model || process.env.DEFAULT_MODEL || 'gpt-4o-mini';

    try {
      return this.registry.languageModel(`${provider}:${model}`);
    } catch (error) {
      throw new LLMProviderError(
        `Failed to get model ${model} from provider ${provider}`,
        provider,
        error as Error
      );
    }
  }

  public getAvailableProviders(): string[] {
    const providers = [];
    
    if (process.env.OPENAI_API_KEY) {
      providers.push('openai');
    }
    
    if (process.env.LMSTUDIO_BASE_URL) {
      providers.push('lmstudio');
    }
    
    return providers;
  }

  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      errors.push('No LLM providers are configured');
    }

    const selectedProvider = process.env.LLM_PROVIDER;
    if (selectedProvider && !availableProviders.includes(selectedProvider)) {
      errors.push(`Selected provider '${selectedProvider}' is not available. Available providers: ${availableProviders.join(', ')}`);
    }

    if (selectedProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      errors.push('OpenAI provider selected but OPENAI_API_KEY is not set');
    }

    if (selectedProvider === 'lmstudio' && !process.env.LMSTUDIO_BASE_URL) {
      errors.push('LM Studio provider selected but LMSTUDIO_BASE_URL is not set');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const llmProvider = LLMProviderManager.getInstance();

// Zod schema for structured classification output
export const classificationSchema = z.object({
  isOffensive: z.boolean().describe('Whether the message contains offensive content'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
  reasoning: z.string().describe('Brief explanation of the classification decision'),
  categories: z.array(z.string()).optional().describe('Specific offensive categories if applicable (e.g., hate-speech, harassment, explicit-content)')
});

// Classification prompt configuration for structured output
export const CLASSIFICATION_PROMPTS = {
  systemPrompt: `You are an expert content moderator. Your task is to classify whether a message contains offensive content.

Offensive content includes:
- Hate speech or discriminatory language based on race, gender, religion, etc.
- Harassment, bullying, or personal threats
- Explicit sexual content or graphic descriptions
- Graphic violence, gore, or disturbing content
- Spam, scams, or malicious content
- Content that promotes illegal activities or self-harm

Analyze the message carefully and provide:
1. A boolean classification (offensive or not)
2. Your confidence level (0.0 to 1.0)
3. Clear reasoning for your decision
4. Optional categories if the content is offensive

Be accurate, consistent, and err on the side of caution for borderline cases.`,

  userPromptTemplate: `Classify this message for offensive content: "{message}"`
};