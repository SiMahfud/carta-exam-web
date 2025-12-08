import { describe, it, expect } from 'vitest'
import {
    toDateTimeLocalString,
    fromDateTimeLocalString,
    formatDateJakarta
} from '../date-utils'

describe('date-utils', () => {
    describe('toDateTimeLocalString', () => {
        it('should convert UTC Date to datetime-local format in UTC+7', () => {
            // UTC midnight should be 07:00 in Jakarta
            const utcDate = new Date('2025-01-15T00:00:00.000Z')
            const result = toDateTimeLocalString(utcDate)
            expect(result).toBe('2025-01-15T07:00')
        })

        it('should handle string input', () => {
            const result = toDateTimeLocalString('2025-01-15T00:00:00.000Z')
            expect(result).toBe('2025-01-15T07:00')
        })

        it('should handle afternoon time correctly', () => {
            // 10:00 UTC = 17:00 Jakarta
            const utcDate = new Date('2025-06-20T10:00:00.000Z')
            const result = toDateTimeLocalString(utcDate)
            expect(result).toBe('2025-06-20T17:00')
        })

        it('should handle day rollover', () => {
            // 20:00 UTC = 03:00 next day Jakarta
            const utcDate = new Date('2025-03-10T20:00:00.000Z')
            const result = toDateTimeLocalString(utcDate)
            expect(result).toBe('2025-03-11T03:00')
        })
    })

    describe('fromDateTimeLocalString', () => {
        it('should convert datetime-local string to UTC Date', () => {
            // 07:00 Jakarta = 00:00 UTC
            const result = fromDateTimeLocalString('2025-01-15T07:00')
            expect(result.toISOString()).toBe('2025-01-15T00:00:00.000Z')
        })

        it('should handle afternoon time correctly', () => {
            // 17:00 Jakarta = 10:00 UTC
            const result = fromDateTimeLocalString('2025-06-20T17:00')
            expect(result.toISOString()).toBe('2025-06-20T10:00:00.000Z')
        })

        it('should handle early morning (day rollback to UTC)', () => {
            // 03:00 Jakarta = 20:00 previous day UTC
            const result = fromDateTimeLocalString('2025-03-11T03:00')
            expect(result.toISOString()).toBe('2025-03-10T20:00:00.000Z')
        })
    })

    describe('formatDateJakarta', () => {
        it('should format Date for display in UTC+7', () => {
            const utcDate = new Date('2025-01-15T00:00:00.000Z')
            const result = formatDateJakarta(utcDate)
            expect(result).toBe('2025-01-15 07:00:00')
        })

        it('should handle string input', () => {
            const result = formatDateJakarta('2025-01-15T00:00:00.000Z')
            expect(result).toBe('2025-01-15 07:00:00')
        })

        it('should format afternoon time correctly', () => {
            const utcDate = new Date('2025-06-20T10:30:45.000Z')
            const result = formatDateJakarta(utcDate)
            expect(result).toBe('2025-06-20 17:30:45')
        })
    })

    describe('round-trip conversion', () => {
        it('should preserve time through conversion cycle', () => {
            const original = '2025-05-15T14:30'
            const date = fromDateTimeLocalString(original)
            const result = toDateTimeLocalString(date)
            expect(result).toBe(original)
        })
    })
})
