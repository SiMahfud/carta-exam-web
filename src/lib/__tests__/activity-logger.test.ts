import { describe, it, expect } from 'vitest'
import { ActivityLogger, logActivity } from '../activity-logger'

describe('activity-logger', () => {
    describe('logActivity function', () => {
        it('should export logActivity function', () => {
            expect(logActivity).toBeDefined()
            expect(typeof logActivity).toBe('function')
        })
    })

    describe('ActivityLogger structure', () => {
        it('should export ActivityLogger object', () => {
            expect(ActivityLogger).toBeDefined()
        })

        it('should have user methods', () => {
            expect(ActivityLogger.user).toBeDefined()
            expect(typeof ActivityLogger.user.created).toBe('function')
            expect(typeof ActivityLogger.user.updated).toBe('function')
            expect(typeof ActivityLogger.user.deleted).toBe('function')
        })

        it('should have subject methods', () => {
            expect(ActivityLogger.subject).toBeDefined()
            expect(typeof ActivityLogger.subject.created).toBe('function')
            expect(typeof ActivityLogger.subject.updated).toBe('function')
            expect(typeof ActivityLogger.subject.deleted).toBe('function')
        })

        it('should have class methods', () => {
            expect(ActivityLogger.class).toBeDefined()
            expect(typeof ActivityLogger.class.created).toBe('function')
            expect(typeof ActivityLogger.class.updated).toBe('function')
            expect(typeof ActivityLogger.class.deleted).toBe('function')
        })

        it('should have examSession methods', () => {
            expect(ActivityLogger.examSession).toBeDefined()
            expect(typeof ActivityLogger.examSession.created).toBe('function')
            expect(typeof ActivityLogger.examSession.started).toBe('function')
            expect(typeof ActivityLogger.examSession.updated).toBe('function')
            expect(typeof ActivityLogger.examSession.deleted).toBe('function')
        })

        it('should have examTemplate methods', () => {
            expect(ActivityLogger.examTemplate).toBeDefined()
            expect(typeof ActivityLogger.examTemplate.created).toBe('function')
            expect(typeof ActivityLogger.examTemplate.updated).toBe('function')
            expect(typeof ActivityLogger.examTemplate.deleted).toBe('function')
        })

        it('should have questionBank methods', () => {
            expect(ActivityLogger.questionBank).toBeDefined()
            expect(typeof ActivityLogger.questionBank.created).toBe('function')
            expect(typeof ActivityLogger.questionBank.updated).toBe('function')
            expect(typeof ActivityLogger.questionBank.deleted).toBe('function')
        })
    })
})
