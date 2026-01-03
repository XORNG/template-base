import type {
  SubAgentMetadata,
  SubAgentConfig,
  ToolDefinition,
  ProcessRequest,
  ProcessResponse,
  HealthStatus,
} from '../types/index.js';
import { SubAgentConfigSchema } from '../types/index.js';
import { createLogger, type Logger } from '../utils/logger.js';
import { validateSchema } from '../utils/validation.js';
import { SubAgentError, ErrorCode, formatError } from '../utils/errors.js';

/**
 * Base class for XORNG sub-agents
 * 
 * Provides common functionality for all sub-agents:
 * - Configuration management
 * - Health checking
 * - Tool registration
 * - Request processing lifecycle
 */
export abstract class BaseSubAgent {
  protected metadata: SubAgentMetadata;
  protected config: SubAgentConfig;
  protected logger: Logger;
  protected tools: Map<string, ToolDefinition> = new Map();
  protected startTime: number;

  constructor(
    metadata: SubAgentMetadata,
    config: Partial<SubAgentConfig> = {}
  ) {
    this.metadata = metadata;
    
    // Validate and set config with defaults
    const configResult = validateSchema(SubAgentConfigSchema, config);
    if (!configResult.success) {
      throw new SubAgentError(
        `Invalid configuration: ${configResult.errors.join(', ')}`,
        ErrorCode.INVALID_CONFIG
      );
    }
    this.config = configResult.data;

    this.logger = createLogger(this.config.logLevel, metadata.name);
    this.startTime = Date.now();

    this.logger.info({
      agent: metadata.name,
      version: metadata.version,
      capabilities: metadata.capabilities,
    }, 'Sub-agent initialized');
  }

  /**
   * Get agent metadata
   */
  getMetadata(): SubAgentMetadata {
    return this.metadata;
  }

  /**
   * Get agent configuration
   */
  getConfig(): SubAgentConfig {
    return this.config;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Register a tool
   */
  protected registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn({ tool: tool.name }, 'Overwriting existing tool');
    }
    this.tools.set(tool.name, tool);
    this.logger.debug({ tool: tool.name }, 'Tool registered');
  }

  /**
   * Get all registered tools
   */
  getTools(): Map<string, ToolDefinition> {
    return this.tools;
  }

  /**
   * Check health status
   */
  async checkHealth(): Promise<HealthStatus> {
    const errors: string[] = [];

    // Run health checks
    try {
      await this.runHealthChecks();
    } catch (error) {
      errors.push(formatError(error).message);
    }

    return {
      healthy: errors.length === 0,
      version: this.metadata.version,
      uptime: this.getUptime(),
      capabilities: this.metadata.capabilities,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Process a request with timing and error handling
   */
  async process(request: ProcessRequest): Promise<ProcessResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    this.logger.info({ requestId, type: request.type }, 'Processing request');

    try {
      // Validate request
      await this.validateRequest(request);

      // Process the request
      const results = await this.handleRequest(request, requestId);

      const response: ProcessResponse = {
        success: true,
        results,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };

      this.logger.info({
        requestId,
        processingTimeMs: response.metadata?.processingTimeMs,
      }, 'Request completed successfully');

      return response;
    } catch (error) {
      const formattedError = formatError(error);

      this.logger.error({
        requestId,
        error: formattedError,
      }, 'Request failed');

      return {
        success: false,
        results: null,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
        error: formattedError.message,
      };
    }
  }

  /**
   * Execute a specific tool
   */
  async executeTool(
    toolName: string,
    input: unknown,
    requestId: string = crypto.randomUUID()
  ): Promise<ProcessResponse> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        results: null,
        error: `Tool '${toolName}' not found`,
      };
    }

    try {
      // Validate input against tool schema
      const inputResult = validateSchema(tool.inputSchema, input);
      if (!inputResult.success) {
        return {
          success: false,
          results: null,
          error: `Invalid input: ${inputResult.errors.join(', ')}`,
        };
      }

      // Execute the tool
      const result = await tool.handler(inputResult.data, {
        requestId,
        logger: this.logger.child({ requestId, tool: toolName }),
        metadata: this.metadata,
      });

      return {
        success: result.success,
        results: result.data,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          ...result.metadata,
        },
        error: result.error,
      };
    } catch (error) {
      const formattedError = formatError(error);
      return {
        success: false,
        results: null,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
        error: formattedError.message,
      };
    }
  }

  /**
   * Initialize the sub-agent
   * Override to perform async initialization
   */
  async initialize(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Shutdown the sub-agent
   * Override to perform cleanup
   */
  async shutdown(): Promise<void> {
    this.logger.info('Sub-agent shutting down');
  }

  /**
   * Validate an incoming request
   * Override to add custom validation
   */
  protected async validateRequest(_request: ProcessRequest): Promise<void> {
    // Default implementation accepts all requests
  }

  /**
   * Handle a request - must be implemented by subclasses
   */
  protected abstract handleRequest(
    request: ProcessRequest,
    requestId: string
  ): Promise<unknown>;

  /**
   * Run health checks - can be overridden
   */
  protected async runHealthChecks(): Promise<void> {
    // Default implementation does nothing
  }
}
