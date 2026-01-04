import { z } from 'zod';
import type { ToolContext, ToolResult } from '../types/index.js';
import { validateSchema } from '../utils/validation.js';
import { SubAgentError, ErrorCode, formatError } from '../utils/errors.js';

/**
 * Base class for tools
 * 
 * Provides structured approach to tool implementation with:
 * - Input validation
 * - Error handling
 * - Logging
 */
export abstract class BaseTool<TInput, TOutput> {
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema: ZodType<TInput>;

  constructor(
    name: string,
    description: string,
    inputSchema: ZodType<TInput>
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Execute the tool with validation and error handling
   */
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { logger, requestId } = context;

    logger.debug({ tool: this.name, requestId }, 'Executing tool');

    try {
      // Validate input
      const validationResult = validateSchema(this.inputSchema, input);
      if (!validationResult.success) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
        };
      }

      // Run the tool implementation
      const output = await this.run(validationResult.data, context);

      logger.debug({ tool: this.name, requestId }, 'Tool completed successfully');

      return {
        success: true,
        data: output,
      };
    } catch (error) {
      const formattedError = formatError(error);
      logger.error({ tool: this.name, requestId, error: formattedError }, 'Tool failed');

      return {
        success: false,
        error: formattedError.message,
        metadata: { code: formattedError.code },
      };
    }
  }

  /**
   * Implement the actual tool logic
   */
  protected abstract run(input: TInput, context: ToolContext): Promise<TOutput>;

  /**
   * Get JSON schema for the tool input
   */
  getJsonSchema(): Record<string, unknown> {
    // Convert Zod schema to JSON schema
    // This is a simplified version - production would use zod-to-json-schema
    const zodDef = this.inputSchema._def;
    return this.zodToJsonSchema(zodDef);
  }

  /**
   * Convert Zod schema definition to JSON schema
   */
  private zodToJsonSchema(def: z.ZodTypeDef): Record<string, unknown> {
    const typeName = (def as { typeName?: string }).typeName;

    switch (typeName) {
      case 'ZodString':
        return { type: 'string' };
      case 'ZodNumber':
        return { type: 'number' };
      case 'ZodBoolean':
        return { type: 'boolean' };
      case 'ZodArray':
        return {
          type: 'array',
          items: this.zodToJsonSchema((def as { type?: { _def: z.ZodTypeDef } }).type?._def || {}),
        };
      case 'ZodObject':
        const shape = (def as { shape?: () => Record<string, z.ZodTypeAny> }).shape?.() || {};
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
          properties[key] = this.zodToJsonSchema(value._def);
          if (!value.isOptional()) {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        };
      case 'ZodOptional':
        return this.zodToJsonSchema((def as { innerType?: { _def: z.ZodTypeDef } }).innerType?._def || {});
      case 'ZodEnum':
        return {
          type: 'string',
          enum: (def as { values?: string[] }).values,
        };
      default:
        return {};
    }
  }
}

/**
 * Helper to create a simple tool from a function
 */
export function createTool<TInput, TOutput>(
  name: string,
  description: string,
  inputSchema: ZodType<TInput>,
  handler: (input: TInput, context: ToolContext) => Promise<TOutput>
): BaseTool<TInput, TOutput> {
  class SimpleTool extends BaseTool<TInput, TOutput> {
    protected async run(input: TInput, context: ToolContext): Promise<TOutput> {
      return handler(input, context);
    }
  }

  return new SimpleTool(name, description, inputSchema);
}
