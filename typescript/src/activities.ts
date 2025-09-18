import { generateObject, generateText } from 'ai';
import { llmProvider, CLASSIFICATION_PROMPTS, classificationSchema } from './llm-config';
import {
  MessageClassificationRequest,
  MessageClassificationResult,
  ClassificationError,
  LLMProviderError
} from './types';

// If you wish to connect any dependencies (eg, database), add in here
export const createActivities = (/* db: typeorm.DataSource */) => ({
  async sayName(name: string): Promise<string> {
    if (!name) {
      name = 'anonymous human';
    }

    return `Hello, ${name}!`;
  },

  async classifyMessage(request: MessageClassificationRequest): Promise<MessageClassificationResult> {
    try {
      // Validate input
      if (!request.message || request.message.trim().length === 0) {
        throw new ClassificationError('Message cannot be empty', request);
      }

      // Get the configured model
      const model = llmProvider.getModel();
      const provider = process.env.LLM_PROVIDER || 'openai';
      const modelName = process.env.DEFAULT_MODEL || 'gpt-4o-mini';

      // Prepare the prompt
      const userPrompt = CLASSIFICATION_PROMPTS.userPromptTemplate.replace(
        '{message}',
        request.message
      );

      console.log(`Classifying message with ${provider}:${modelName}`);
      console.log(`Message preview: "${request.message.substring(0, 100)}${request.message.length > 100 ? '...' : ''}"`);

      let classificationData;

      // Use different approaches based on provider
      if (provider === 'lmstudio') {
        // LM Studio doesn't support structured output, use generateText with JSON parsing
        const result = await generateText({
          model,
          system: CLASSIFICATION_PROMPTS.systemPrompt + '\n\nRespond with ONLY a valid JSON object in this exact format: {"isOffensive": boolean, "confidence": number, "reasoning": "string"}',
          prompt: userPrompt,
          temperature: 0.1,
          maxOutputTokens: 300,
        });

        // Parse the JSON response
        try {
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            // Validate with Zod schema
            classificationData = classificationSchema.parse(parsedData);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          throw new ClassificationError(
            `Failed to parse LM Studio response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}. Response was: ${result.text}`,
            request,
            parseError instanceof Error ? parseError : undefined
          );
        }
      } else {
        // OpenAI supports structured output
        const result = await generateObject({
          model,
          system: CLASSIFICATION_PROMPTS.systemPrompt,
          prompt: userPrompt,
          schema: classificationSchema,
          temperature: 0.1,
          maxOutputTokens: 300,
        });

        classificationData = result.object;
      }

      const classificationResult: MessageClassificationResult = {
        message: request.message,
        isOffensive: classificationData.isOffensive,
        confidence: classificationData.confidence,
        reasoning: classificationData.reasoning,
        provider,
        model: modelName,
        timestamp: new Date(),
      };

      // Log the result with categories if available
      const categoriesInfo = classificationData.categories && classificationData.categories.length > 0
        ? ` (categories: ${classificationData.categories.join(', ')})`
        : '';
      
      console.log(`Classification result: ${classificationResult.isOffensive ? 'OFFENSIVE' : 'NOT OFFENSIVE'} (confidence: ${classificationResult.confidence})${categoriesInfo}`);

      return classificationResult;

    } catch (error) {
      console.error('Error in classifyMessage activity:', error);
      
      // Handle specific error types
      if (error instanceof LLMProviderError || error instanceof ClassificationError) {
        throw error;
      }
      
      // Check if it's a structured output validation error
      if (error instanceof Error && error.message.includes('schema')) {
        throw new ClassificationError(
          `LLM response validation failed: ${error.message}. This indicates the model couldn't generate properly structured output.`,
          request,
          error
        );
      }
      
      // Generic error handling
      throw new ClassificationError(
        `Failed to classify message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        request,
        error instanceof Error ? error : undefined
      );
    }
  },
});
