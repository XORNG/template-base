import { z } from 'zod';

/**
 * Sub-agent capability types
 */
export type SubAgentCapability = 
  | 'validate'
  | 'analyze'
  | 'transform'
  | 'generate'
  | 'execute'
  | 'retrieve'
  | 'search';

/**
 * Sub-agent metadata
 */
export interface SubAgentMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: SubAgentCapability[];
  author?: string;
  repository?: string;
}

/**
 * Tool definition for sub-agents
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  handler: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  requestId: string;
  logger: import('../utils/logger.js').Logger;
  metadata: SubAgentMetadata;
}

/**
 * Result from tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Processing request
 */
export interface ProcessRequest {
  type: string;
  content: string;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/**
 * Processing response
 */
export interface ProcessResponse {
  success: boolean;
  results: unknown;
  metadata?: {
    processingTimeMs: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
  error?: string;
}

/**
 * Zod schemas for validation
 */
export const ProcessRequestSchema = z.object({
  type: z.string(),
  content: z.string(),
  context: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
});

export const ProcessResponseSchema = z.object({
  success: z.boolean(),
  results: z.unknown(),
  metadata: z.object({
    processingTimeMs: z.number(),
    tokensUsed: z.number().optional(),
  }).passthrough().optional(),
  error: z.string().optional(),
});

/**
 * Health check response
 */
export interface HealthStatus {
  healthy: boolean;
  version: string;
  uptime: number;
  capabilities: SubAgentCapability[];
  errors?: string[];
}

/**
 * Configuration for sub-agents
 */
export interface SubAgentConfig {
  logLevel?: string;
  timeout?: number;
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export const SubAgentConfigSchema = z.object({
  logLevel: z.string().optional().default('info'),
  timeout: z.number().optional().default(30000),
  maxConcurrent: z.number().optional().default(5),
  retryAttempts: z.number().optional().default(3),
  retryDelay: z.number().optional().default(1000),
});
