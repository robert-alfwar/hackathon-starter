# Message Classification Temporal Workflow

This project implements a Temporal workflow for classifying messages as offensive or not offensive using various LLM providers (OpenAI and LM Studio).

## Features

- **Multi-Provider Support**: OpenAI and LM Studio (OpenAI-compatible)
- **Smart Structured Output**: Uses `generateObject` for OpenAI, `generateText` with JSON parsing for LM Studio
- **Temporal Reliability**: Built-in retry logic and error handling
- **Batch Processing**: Support for single message or batch classification
- **Flexible Configuration**: Environment-based provider switching
- **Type-Safe Results**: Zod schema validation for all providers
- **Provider-Optimized**: Adapts to each provider's capabilities automatically

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_TLS=false
TEMPORAL_NAMESPACE=default

# LLM Provider Configuration
LLM_PROVIDER=openai  # or "lmstudio"

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=  # Optional: for custom endpoints

# LM Studio Configuration
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_API_KEY=  # Optional: if required

# Model Configuration
DEFAULT_MODEL=gpt-4o-mini  # or your preferred model
```

### 3. Start Temporal Server

Make sure you have Temporal server running locally:

```bash
# Using Temporal CLI
temporal server start-dev

# Or using Docker
docker run --rm -p 7233:7233 temporalio/auto-setup:latest
```

### 4. Start the Worker

In one terminal, start the Temporal worker:

```bash
npm run worker
```

## Usage

### Single Message Classification

```bash
npm run classify
```

This will classify a test message and display the results.

### Batch Message Classification

```bash
npm run classify:batch
```

This will classify multiple test messages in parallel.

### Custom Classification

You can also use the workflow programmatically:

```typescript
import { Client, Connection } from '@temporalio/client';
import { messageClassificationWorkflow } from './src/workflows';
import { MessageClassificationRequest } from './src/types';

const client = new Client({
  connection: await Connection.connect({
    address: 'localhost:7233',
  }),
});

const request: MessageClassificationRequest = {
  message: "Your message to classify here",
  userId: "user-123",
  metadata: { source: "api" }
};

const handle = await client.workflow.start(messageClassificationWorkflow, {
  taskQueue: 'hackathon',
  args: [request],
  workflowId: 'classification-' + Date.now(),
});

const result = await handle.result();
console.log('Classification result:', result);
```

## Configuration Options

### LLM Providers

#### OpenAI
- Set `LLM_PROVIDER=openai`
- Provide `OPENAI_API_KEY`
- Optionally set `OPENAI_BASE_URL` for custom endpoints
- Supported models: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`, etc.

#### LM Studio
- Set `LLM_PROVIDER=lmstudio`
- Set `LMSTUDIO_BASE_URL` (default: `http://localhost:1234/v1`)
- Optionally set `LMSTUDIO_API_KEY` if required
- Model name depends on what you have loaded in LM Studio

### Classification Response

The workflow returns a `MessageClassificationResult` object with structured, validated data:

```typescript
{
  message: string;           // Original message
  isOffensive: boolean;      // Classification result (validated)
  confidence: number;        // Confidence score (0-1, validated)
  reasoning: string;         // LLM's reasoning (required)
  provider: string;          // Provider used
  model: string;            // Model used
  timestamp: Date;          // Classification timestamp
}
```

**Structured Output Schema:**
```typescript
const classificationSchema = z.object({
  isOffensive: z.boolean().describe('Whether the message contains offensive content'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
  reasoning: z.string().describe('Brief explanation of the classification decision'),
  categories: z.array(z.string()).optional().describe('Specific offensive categories if applicable')
});
```

## Error Handling

The workflow includes comprehensive error handling:

- **Retry Logic**: Automatic retries for transient failures
- **Provider-Specific Handling**: Adapts error handling to each provider's capabilities
- **Zod Schema Validation**: Ensures valid response format for all providers
- **Configuration Validation**: Validates provider setup before starting
- **Detailed Error Messages**: Clear error reporting for debugging
- **JSON Parsing Errors**: Specific handling for LM Studio response parsing
- **Type Safety**: Compile-time and runtime validation of responses

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run build.watch
```

### Worker with Auto-reload

```bash
npm run worker:watch
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Temporal        │───▶│   Worker        │
│                 │    │  Workflow        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Classification  │───▶│  Provider       │
                       │    Activity      │    │  Detection      │
                       │                  │    │                 │
                       └──────────────────┘    └─────────────────┘
                                                        │
                                ┌───────────────────────┼───────────────────────┐
                                ▼                       ▼                       ▼
                    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                    │  OpenAI:        │    │  LM Studio:     │    │  Zod Schema     │
                    │  generateObject │    │  generateText   │    │  Validation     │
                    │                 │    │  + JSON Parse   │    │                 │
                    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Improvements

- **Provider-Adaptive**: Uses optimal approach for each provider
- **OpenAI**: Native `generateObject` with structured output
- **LM Studio**: `generateText` with JSON parsing and Zod validation
- **Universal Validation**: All responses validated with Zod schema
- **Better Compatibility**: Works reliably with both provider types

## Troubleshooting

### Common Issues

1. **"No LLM providers configured"**
   - Check your `.env` file
   - Ensure API keys are set correctly
   - Verify provider URLs are accessible

2. **"Failed to parse LLM response"**
   - The system will fall back to keyword-based classification
   - Check if your model supports structured JSON output
   - Consider adjusting the prompt in `src/llm-config.ts`

3. **Temporal connection errors**
   - Ensure Temporal server is running on `localhost:7233`
   - Check `TEMPORAL_ADDRESS` in your `.env` file

### Logs

The worker and workflows provide detailed logging:
- Provider configuration validation
- Classification requests and results
- Error details and fallback actions

## Contributing

1. Add new providers in `src/llm-config.ts`
2. Extend classification logic in `src/activities.ts`
3. Add new workflow patterns in `src/workflows.ts`
4. Update tests and documentation