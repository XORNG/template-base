/**
 * XORNG Template Base
 * 
 * Shared utilities and base classes for XORNG sub-agent templates.
 */

// Base classes
export { BaseSubAgent } from './base/BaseSubAgent.js';
export { BaseTool } from './base/BaseTool.js';

// Types
export * from './types/index.js';

// Utilities
export { createLogger, type Logger } from './utils/logger.js';
export { validateSchema, createSchema } from './utils/validation.js';
export { formatError, ErrorCode, SubAgentError } from './utils/errors.js';

// MCP helpers
export { createMcpServer, registerTools } from './mcp/server.js';
export { createToolHandler, type ToolHandler } from './mcp/tools.js';
