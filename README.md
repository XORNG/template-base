# XORNG Template Base

Base template utilities and abstractions for building XORNG sub-agents.

## Overview

`@xorng/template-base` provides the foundational building blocks for creating sub-agents:

- **BaseSubAgent** - Abstract base class for sub-agents
- **BaseTool** - Abstract base class for tools
- **MCP Helpers** - Utilities for MCP server setup
- **Validation** - Zod-based schema validation
- **Error Handling** - Standardized error types

## Installation

```bash
npm install @xorng/template-base
```

## Quick Start

```typescript
import {
  BaseSubAgent,
  createMcpServer,
  registerTools,
  createToolHandler,
} from '@xorng/template-base';
import { z } from 'zod';

// Define your sub-agent
class MyAgent extends BaseSubAgent {
  constructor() {
    super({
      name: 'my-agent',
      version: '1.0.0',
      description: 'My custom sub-agent',
      capabilities: ['analyze'],
    });

    // Register tools
    this.registerTool(createToolHandler({
      name: 'analyze',
      description: 'Analyze content',
      inputSchema: z.object({
        content: z.string(),
      }),
      handler: async (input, context) => {
        context.logger.info('Analyzing...');
        return { analyzed: true };
      },
    }));
  }

  protected async handleRequest(request, requestId) {
    return this.executeTool(request.type, request, requestId);
  }
}

// Start MCP server
const agent = new MyAgent();
const { server, transport, logger } = createMcpServer({
  metadata: agent.getMetadata(),
});

registerTools(server, agent.getTools(), logger);
await server.connect(transport);
```

## API Reference

### BaseSubAgent

Abstract base class for sub-agents.

```typescript
abstract class BaseSubAgent {
  constructor(metadata: SubAgentMetadata, config?: SubAgentConfig);
  
  getMetadata(): SubAgentMetadata;
  getConfig(): SubAgentConfig;
  getTools(): Map<string, ToolDefinition>;
  
  async checkHealth(): Promise<HealthStatus>;
  async process(request: ProcessRequest): Promise<ProcessResponse>;
  async executeTool(name: string, input: unknown): Promise<ProcessResponse>;
  
  protected registerTool(tool: ToolDefinition): void;
  protected abstract handleRequest(request, requestId): Promise<unknown>;
}
```

### BaseTool

Abstract base class for tools.

```typescript
abstract class BaseTool<TInput, TOutput> {
  constructor(name: string, description: string, inputSchema: ZodType<TInput>);
  
  async execute(input: unknown, context: ToolContext): Promise<ToolResult>;
  getJsonSchema(): Record<string, unknown>;
  
  protected abstract run(input: TInput, context: ToolContext): Promise<TOutput>;
}
```

### MCP Helpers

```typescript
// Create MCP server
function createMcpServer(options: McpServerOptions): {
  server: McpServer;
  transport: StdioServerTransport;
  logger: Logger;
};

// Register tools with MCP server
function registerTools(
  server: McpServer,
  tools: Map<string, ToolDefinition>,
  logger: Logger
): void;

// Create a tool handler
function createToolHandler<TInput, TOutput>(
  options: CreateToolOptions<TInput, TOutput>
): ToolDefinition;
```

### Error Handling

```typescript
// Error codes
enum ErrorCode {
  UNKNOWN, INVALID_INPUT, TIMEOUT, PROCESSING_FAILED, ...
}

// Custom error class
class SubAgentError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// Format errors
function formatError(error: unknown): {
  message: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
};
```

### Validation

```typescript
// Validate data against schema
function validateSchema<T>(
  schema: ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] };

// Common schema helpers
const schemas = {
  nonEmptyString,
  positiveNumber,
  url,
  email,
  filePath,
  codeSnippet,
  severity,
};
```

## Types

### SubAgentMetadata

```typescript
interface SubAgentMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: SubAgentCapability[];
  author?: string;
  repository?: string;
}
```

### SubAgentCapability

```typescript
type SubAgentCapability = 
  | 'validate'
  | 'analyze'
  | 'transform'
  | 'generate'
  | 'execute'
  | 'retrieve'
  | 'search';
```

### ToolContext

```typescript
interface ToolContext {
  requestId: string;
  logger: Logger;
  metadata: SubAgentMetadata;
}
```

## License

MIT
