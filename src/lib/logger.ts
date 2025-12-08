import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Centralized logger using Pino
 * 
 * Usage:
 * import { logger } from '@/lib/logger'
 * 
 * logger.info('User logged in', { userId: '123' })
 * logger.error('Failed to process request', { error: err.message })
 * logger.warn('Rate limit approaching', { remaining: 5 })
 * logger.debug('Processing item', { itemId: 'abc' })
 */
export const logger = pino({
    level: isDevelopment ? 'debug' : 'info',
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        env: process.env.NODE_ENV,
    },
})

/**
 * Create a child logger with additional context
 * Useful for adding request-specific info
 */
export function createLogger(context: Record<string, unknown>) {
    return logger.child(context)
}

/**
 * Log levels available:
 * - trace: Very detailed debugging
 * - debug: Debugging information
 * - info: General information
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Critical errors
 */

// Convenience exports for common use cases
export const logInfo = (message: string, data?: Record<string, unknown>) => {
    logger.info(data, message)
}

export const logError = (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    if (error instanceof Error) {
        logger.error({ ...data, error: error.message, stack: error.stack }, message)
    } else {
        logger.error({ ...data, error }, message)
    }
}

export const logWarn = (message: string, data?: Record<string, unknown>) => {
    logger.warn(data, message)
}

export const logDebug = (message: string, data?: Record<string, unknown>) => {
    logger.debug(data, message)
}

export default logger
