import { z, ZodError, ZodType } from 'zod';

/**
 * Validate data against a Zod schema
 */
export function validateSchema<T>(
  schema: ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        ),
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Create a schema with common fields
 */
export function createSchema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Common schema helpers
 */
export const schemas = {
  /**
   * Non-empty string
   */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),

  /**
   * Positive number
   */
  positiveNumber: z.number().positive(),

  /**
   * URL string
   */
  url: z.string().url(),

  /**
   * Email string
   */
  email: z.string().email(),

  /**
   * ISO date string
   */
  isoDate: z.string().datetime(),

  /**
   * File path
   */
  filePath: z.string().regex(
    /^[a-zA-Z0-9_\-./\\]+$/,
    'Invalid file path characters'
  ),

  /**
   * Code snippet with language
   */
  codeSnippet: z.object({
    code: z.string(),
    language: z.string().optional(),
    filename: z.string().optional(),
  }),

  /**
   * Severity level
   */
  severity: z.enum(['error', 'warning', 'info', 'hint']),
};
