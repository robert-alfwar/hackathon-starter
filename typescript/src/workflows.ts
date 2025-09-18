import { proxyActivities } from '@temporalio/workflow';

import type { createActivities } from './activities';
import type { MessageClassificationRequest, MessageClassificationResult } from './types';

const { sayName, classifyMessage } = proxyActivities<ReturnType<typeof createActivities>>({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

// Add Workflow Definitions here.
export async function helloWorldWorkflow(name: string): Promise<string> {
  // Your workflow code here
  return sayName(name);
}

/**
 * Message Classification Workflow
 *
 * This workflow accepts a message and classifies it as offensive or not offensive
 * using configured LLM providers (OpenAI or LM Studio).
 *
 * @param request - The message classification request
 * @returns Promise<MessageClassificationResult> - The classification result
 */
export async function messageClassificationWorkflow(
  request: MessageClassificationRequest
): Promise<MessageClassificationResult> {
  // Validate input at workflow level
  if (!request || !request.message) {
    throw new Error('Invalid request: message is required');
  }

  // Log workflow start
  console.log(`Starting message classification workflow for message: "${request.message.substring(0, 50)}..."`);

  try {
    // Call the classification activity
    const result = await classifyMessage(request);
    
    // Log workflow completion
    console.log(`Message classification completed: ${result.isOffensive ? 'OFFENSIVE' : 'NOT OFFENSIVE'}`);
    
    return result;
  } catch (error) {
    // Log workflow error
    console.error('Message classification workflow failed:', error);
    throw error;
  }
}

/**
 * Batch Message Classification Workflow
 *
 * This workflow processes multiple messages in parallel for classification.
 *
 * @param requests - Array of message classification requests
 * @returns Promise<MessageClassificationResult[]> - Array of classification results
 */
export async function batchMessageClassificationWorkflow(
  requests: MessageClassificationRequest[]
): Promise<MessageClassificationResult[]> {
  if (!requests || requests.length === 0) {
    throw new Error('Invalid request: at least one message is required');
  }

  console.log(`Starting batch message classification workflow for ${requests.length} messages`);

  try {
    // Process all messages in parallel
    const results = await Promise.all(
      requests.map(request => classifyMessage(request))
    );

    console.log(`Batch message classification completed: ${results.length} messages processed`);
    
    return results;
  } catch (error) {
    console.error('Batch message classification workflow failed:', error);
    throw error;
  }
}
