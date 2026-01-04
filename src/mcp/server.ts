import { ZodType } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { SubAgentMetadata, ToolDefinition } from '../types/index.js';
import { createLogger, type Logger } from '../utils/logger.js';

/**
 * Options for creating an MCP server
 */
export interface McpServerOptions {
  metadata: SubAgentMetadata;
  logLevel?: string;
}

/**
 * Create and configure an MCP server
 */
export function createMcpServer(options: McpServerOptions): {
  server: McpServer;
  transport: StdioServerTransport;
  logger: Logger;
} {
  const logger = createLogger(options.logLevel || 'info', options.metadata.name);

  const server = new Server({
    name: options.metadata.name,
    version: options.metadata.version,
  });

  const transport = new StdioServerTransport();

  return { server, transport, logger };
}

/**
 * Register tools with an MCP server
 */
export function registerTools(
  server: McpServer,
  tools: Map<string, ToolDefinition> | ToolDefinition[],
  logger: Logger
): void {
  const toolsArray = tools instanceof Map
    ? Array.from(tools.values())
    : tools;

  for (const tool of toolsArray) {
    const jsonSchema = zodToJsonSchema(tool.inputSchema);

    server.tool(
      tool.name,
      tool.description,
      jsonSchema as Record<string, unknown>,
      async (params) => {
        const requestId = crypto.randomUUID();
        logger.info({ tool: tool.name, requestId }, 'Tool invoked');

        try {
          const result = await tool.handler(params, {
            requestId,
            logger: logger.child({ requestId, tool: tool.name }),
            metadata: { name: '', version: '', description: '', capabilities: [] },
          });

          if (result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(result.data, null, 2),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ error: result.error }, null, 2),
                },
              ],
              isError: true,
            };
          }
        } catch (error) {
          logger.error({ tool: tool.name, requestId, error }, 'Tool execution failed');
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }
    );

    logger.debug({ tool: tool.name }, 'Tool registered with MCP server');
  }
}

/**
 * Convert Zod schema to JSON schema for MCP
 */
function zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  const def = schema._def as { typeName?: string };
  return convertZodDef(def);
}

function convertZodDef(def: z.ZodTypeDef & { typeName?: string }): Record<string, unknown> {
  switch (def.typeName) {
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray': {
      const arrayDef = def as { type?: { _def: z.ZodTypeDef } };
      return {
        type: 'array',
        items: arrayDef.type ? convertZodDef(arrayDef.type._def as z.ZodTypeDef & { typeName?: string }) : {},
      };
    }
    case 'ZodObject': {
      const objectDef = def as { shape?: () => Record<string, z.ZodTypeAny> };
      const shape = objectDef.shape?.() || {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convertZodDef(value._def as z.ZodTypeDef & { typeName?: string });
        if (!value.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
      };
    }
    case 'ZodOptional': {
      const optionalDef = def as { innerType?: { _def: z.ZodTypeDef } };
      return optionalDef.innerType
        ? convertZodDef(optionalDef.innerType._def as z.ZodTypeDef & { typeName?: string })
        : {};
    }
    case 'ZodEnum': {
      const enumDef = def as { values?: string[] };
      return {
        type: 'string',
        enum: enumDef.values,
      };
    }
    case 'ZodLiteral': {
      const literalDef = def as { value?: unknown };
      return { const: literalDef.value };
    }
    case 'ZodUnion': {
      const unionDef = def as { options?: Array<{ _def: z.ZodTypeDef }> };
      return {
        oneOf: unionDef.options?.map(opt =>
          convertZodDef(opt._def as z.ZodTypeDef & { typeName?: string })
        ) || [],
      };
    }
    default:
      return {};
  }
}
