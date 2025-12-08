import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger, createLogger, logInfo, logError, logWarn, logDebug } from '../logger'

// Mock pino to avoid actual logging during tests
vi.mock('pino', () => {
    const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(() => mockLogger),
    }
    return {
        default: vi.fn(() => mockLogger),
    }
})

describe('logger', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('logger instance', () => {
        it('should export a logger instance', () => {
            expect(logger).toBeDefined()
        })

        it('should have standard log methods', () => {
            expect(typeof logger.info).toBe('function')
            expect(typeof logger.error).toBe('function')
            expect(typeof logger.warn).toBe('function')
            expect(typeof logger.debug).toBe('function')
        })
    })

    describe('createLogger', () => {
        it('should create a child logger with context', () => {
            const childLogger = createLogger({ requestId: '123' })
            expect(childLogger).toBeDefined()
        })
    })

    describe('convenience functions', () => {
        it('logInfo should call logger.info', () => {
            logInfo('test message', { key: 'value' })
            expect(logger.info).toHaveBeenCalled()
        })

        it('logWarn should call logger.warn', () => {
            logWarn('warning message')
            expect(logger.warn).toHaveBeenCalled()
        })

        it('logDebug should call logger.debug', () => {
            logDebug('debug message')
            expect(logger.debug).toHaveBeenCalled()
        })

        it('logError should handle Error objects', () => {
            const error = new Error('test error')
            logError('error occurred', error)
            expect(logger.error).toHaveBeenCalled()
        })

        it('logError should handle non-Error objects', () => {
            logError('error occurred', { code: 500 })
            expect(logger.error).toHaveBeenCalled()
        })
    })
})
