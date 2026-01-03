import pino from 'pino';

export type Logger = pino.Logger;

/**
 * Create a configured logger instance
 */
export function createLogger(level: string = 'info', name?: string): Logger {
  return pino({
    name: name || 'xorng-subagent',
    level,
    transport: process.env['NODE_ENV'] !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
