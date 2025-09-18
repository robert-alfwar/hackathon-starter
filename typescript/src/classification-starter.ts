import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import * as dotenv from 'dotenv';

import { TASK_QUEUE_NAME } from './shared';
import { messageClassificationWorkflow, batchMessageClassificationWorkflow } from './workflows';
import { MessageClassificationRequest } from './types';

// Load environment variables
dotenv.config();

async function runSingleClassification() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS,
    tls: process.env.TEMPORAL_TLS === 'true',
    apiKey: process.env.TEMPORAL_API_KEY,
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE,
  });

  // Test message classification
  const testMessage: MessageClassificationRequest = {
    message: "Hello, this is a nice and friendly message!",
    userId: "test-user-123",
    metadata: {
      source: "test",
      timestamp: new Date().toISOString()
    }
  };

  console.log('Starting message classification workflow...');
  console.log(`Message: "${testMessage.message}"`);

  const handle = await client.workflow.start(messageClassificationWorkflow, {
    taskQueue: TASK_QUEUE_NAME,
    args: [testMessage],
    workflowId: 'message-classification-' + nanoid(),
  });

  console.log(`Started workflow ${handle.workflowId}`);

  try {
    const result = await handle.result();
    console.log('\n=== Classification Result ===');
    console.log(`Message: ${result.message}`);
    console.log(`Is Offensive: ${result.isOffensive}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Reasoning: ${result.reasoning}`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);
    console.log(`Timestamp: ${result.timestamp}`);
  } catch (error) {
    console.error('Workflow failed:', error);
  }

  await connection.close();
}

async function runBatchClassification() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS,
    tls: process.env.TEMPORAL_TLS === 'true',
    apiKey: process.env.TEMPORAL_API_KEY,
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE,
  });

  // Test batch message classification
  const testMessages: MessageClassificationRequest[] = [
    {
      message: "Hello, this is a nice and friendly message!",
      userId: "test-user-1",
    },
    {
      message: "You are such an idiot and I hate you!",
      userId: "test-user-2",
    },
    {
      message: "Can you help me with my homework please?",
      userId: "test-user-3",
    },
    {
      message: "This product is amazing, I love it!",
      userId: "test-user-4",
    }
  ];

  console.log('Starting batch message classification workflow...');
  console.log(`Processing ${testMessages.length} messages`);

  const handle = await client.workflow.start(batchMessageClassificationWorkflow, {
    taskQueue: TASK_QUEUE_NAME,
    args: [testMessages],
    workflowId: 'batch-classification-' + nanoid(),
  });

  console.log(`Started workflow ${handle.workflowId}`);

  try {
    const results = await handle.result();
    console.log('\n=== Batch Classification Results ===');
    results.forEach((result, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`Message: "${result.message}"`);
      console.log(`Is Offensive: ${result.isOffensive}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Reasoning: ${result.reasoning}`);
    });

    const offensiveCount = results.filter(r => r.isOffensive).length;
    console.log(`\n=== Summary ===`);
    console.log(`Total messages: ${results.length}`);
    console.log(`Offensive messages: ${offensiveCount}`);
    console.log(`Clean messages: ${results.length - offensiveCount}`);

  } catch (error) {
    console.error('Batch workflow failed:', error);
  }

  await connection.close();
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';

  console.log(`Running in ${mode} mode`);
  console.log(`LLM Provider: ${process.env.LLM_PROVIDER || 'openai'}`);
  console.log(`Model: ${process.env.DEFAULT_MODEL || 'gpt-4o-mini'}`);
  console.log('---');

  try {
    if (mode === 'batch') {
      await runBatchClassification();
    } else {
      await runSingleClassification();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}