/**
 * Error codes for sub-agents
 */
export enum ErrorCode {
  // General errors
  UNKNOWN = 'UNKNOWN',
  INVALID_INPUT = 'INVALID_INPUT',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Processing errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',

  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',

  // Communication errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
}

/**
 * Custom error class for sub-agents
 */
export class SubAgentError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    details?: Record<string, unknown>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'SubAgentError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;

    // Maintain proper stack trace
    Error.captureStackTrace(this, SubAgentError);
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Format an error for response
 */
export function formatError(error: unknown): {
  message: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
} {
  if (error instanceof SubAgentError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: ErrorCode.UNKNOWN,
      details: { stack: error.stack },
    };
  }

  return {
    message: String(error),
    code: ErrorCode.UNKNOWN,
  };
}

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>
): SubAgentError {
  return new SubAgentError(message, ErrorCode.INVALID_INPUT, details, false);
}

/**
 * Create a processing error
 */
export function processingError(
  message: string,
  details?: Record<string, unknown>,
  retryable: boolean = false
): SubAgentError {
  return new SubAgentError(message, ErrorCode.PROCESSING_FAILED, details, retryable);
}

/**
 * Create a timeout error
 */
export function timeoutError(
  operation: string,
  timeoutMs: number
): SubAgentError {
  return new SubAgentError(
    `Operation '${operation}' timed out after ${timeoutMs}ms`,
    ErrorCode.TIMEOUT,
    { operation, timeoutMs },
    true
  );
}
