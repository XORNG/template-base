import { z, ZodType } from 'zod';
import type { ToolContext, ToolResult, ToolDefinition } from '../types/index.js';

/**
 * Tool handler function type
 */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult & { data?: TOutput }>;

/**
 * Options for creating a tool handler
 */
export interface CreateToolOptions<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: ZodType<TInput>;
  handler: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

/**
 * Create a tool handler with proper typing and validation
 */
export function createToolHandler<TInput, TOutput>(
  options: CreateToolOptions<TInput, TOutput>
): ToolDefinition {
  return {
    name: options.name,
    description: options.description,
    inputSchema: options.inputSchema,
    handler: async (input: unknown, context: ToolContext): Promise<ToolResult> => {
      const { logger, requestId } = context;

      try {
        // Validate input
        const parseResult = options.inputSchema.safeParse(input);
        if (!parseResult.success) {
          return {
            success: false,
            error: `Validation failed: ${parseResult.error.errors.map(e => e.message).join(', ')}`,
          };
        }

        // Execute handler
        const output = await options.handler(parseResult.data, context);

        return {
          success: true,
          data: output,
        };
      } catch (error) {
        logger.error({ requestId, error }, 'Tool handler error');
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Compose multiple tool handlers
 */
export function composeTools(
  ...tools: ToolDefinition[]
): Map<string, ToolDefinition> {
  const toolMap = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    toolMap.set(tool.name, tool);
  }
  return toolMap;
}

/**
 * Create a process tool (standard entry point for sub-agents)
 */
export function createProcessTool(
  handler: (type: string, content: string, context: ToolContext) => Promise<unknown>
): ToolDefinition {
  return createToolHandler({
    name: 'process',
    description: 'Process a request with this sub-agent',
    inputSchema: z.object({
      type: z.string().describe('The type of request'),
      content: z.string().describe('The content to process'),
      options: z.record(z.unknown()).optional().describe('Additional options'),
    }),
    handler: async (input, context) => {
      return handler(input.type, input.content, context);
    },
  });
}

/**
 * Create a health check tool
 */
export function createHealthTool(
  getHealth: () => Promise<{
    healthy: boolean;
    version: string;
    uptime: number;
    errors?: string[];
  }>
): ToolDefinition {
  return createToolHandler({
    name: 'health',
    description: 'Check the health status of this sub-agent',
    inputSchema: z.object({}),
    handler: async () => {
      return getHealth();
    },
  });
}
