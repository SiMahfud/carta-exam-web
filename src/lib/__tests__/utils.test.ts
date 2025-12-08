import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
    describe('cn function', () => {
        it('should merge class names', () => {
            const result = cn('foo', 'bar')
            expect(result).toBe('foo bar')
        })

        it('should handle conditional classes', () => {
            const result = cn('base', true && 'active', false && 'inactive')
            expect(result).toBe('base active')
        })

        it('should merge tailwind classes correctly', () => {
            // tailwind-merge should handle conflicting classes
            const result = cn('p-4', 'p-2')
            expect(result).toBe('p-2')
        })

        it('should handle object notation', () => {
            const result = cn({ foo: true, bar: false, baz: true })
            expect(result).toBe('foo baz')
        })

        it('should handle array of classes', () => {
            const result = cn(['foo', 'bar'], 'baz')
            expect(result).toBe('foo bar baz')
        })

        it('should handle undefined and null', () => {
            const result = cn('foo', undefined, null, 'bar')
            expect(result).toBe('foo bar')
        })

        it('should return empty string for no arguments', () => {
            const result = cn()
            expect(result).toBe('')
        })

        it('should handle mixed tailwind utilities', () => {
            const result = cn('text-red-500', 'text-blue-500')
            expect(result).toBe('text-blue-500')
        })

        it('should preserve non-conflicting classes', () => {
            const result = cn('bg-red-500', 'text-white', 'p-4')
            expect(result).toBe('bg-red-500 text-white p-4')
        })
    })
})
