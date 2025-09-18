// Message classification types and interfaces

export interface MessageClassificationRequest {
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface MessageClassificationResult {
  message: string;
  isOffensive: boolean;
  confidence?: number;
  reasoning?: string;
  provider: string;
  model: string;
  timestamp: Date;
}

export interface LLMProviderConfig {
  provider: 'openai' | 'lmstudio';
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface ClassificationPromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
}

// Error types for better error handling
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class ClassificationError extends Error {
  constructor(
    message: string,
    public request: MessageClassificationRequest,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}