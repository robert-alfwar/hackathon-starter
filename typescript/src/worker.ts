import { NativeConnection, Worker } from '@temporalio/worker';
import * as dotenv from 'dotenv';

import { createActivities } from './activities';
import { TASK_QUEUE_NAME } from './shared';
import { llmProvider } from './llm-config';

// Load environment variables
dotenv.config();

async function run() {
  // Validate LLM configuration before starting worker
  const validation = llmProvider.validateConfiguration();
  if (!validation.isValid) {
    console.error('LLM configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('LLM configuration validated successfully');
  console.log(`Available providers: ${llmProvider.getAvailableProviders().join(', ')}`);
  console.log(`Selected provider: ${process.env.LLM_PROVIDER || 'openai'}`);
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS,
    tls: process.env.TEMPORAL_TLS === 'true',
    apiKey: process.env.TEMPORAL_API_KEY,
  });

  try {
    // Create the worker with the task queue "hackathon"
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE,
      taskQueue: TASK_QUEUE_NAME,
      // Workflows are registered using a path as they run in a separate JS context.
      workflowsPath: require.resolve('./workflows'),
      // Register the activities - you may need to inject dependencies in here
      activities: createActivities(),
    });

    await worker.run();
  } finally {
    // Close the connection once the worker has stopped
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
