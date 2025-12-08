import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter } from '../rate-limit'

describe('RateLimiter', () => {
    beforeEach(() => {
        // Reset time mocking before each test
        vi.useRealTimers()
    })

    it('should allow requests within limit', async () => {
        const limiter = new RateLimiter({
            interval: 60000,
            uniqueTokenPerInterval: 100
        })
        const check = limiter.getCheck()

        // Should not throw for first 5 requests
        await expect(check(5, 'test-token')).resolves.toBeUndefined()
        await expect(check(5, 'test-token')).resolves.toBeUndefined()
        await expect(check(5, 'test-token')).resolves.toBeUndefined()
        await expect(check(5, 'test-token')).resolves.toBeUndefined()
        await expect(check(5, 'test-token')).resolves.toBeUndefined()
    })

    it('should throw when rate limit exceeded', async () => {
        const limiter = new RateLimiter({
            interval: 60000,
            uniqueTokenPerInterval: 100
        })
        const check = limiter.getCheck()

        // Use up the limit
        for (let i = 0; i < 3; i++) {
            await check(3, 'test-token-2')
        }

        // 4th request should throw
        await expect(check(3, 'test-token-2')).rejects.toThrow('Rate limit exceeded')
    })

    it('should track different tokens separately', async () => {
        const limiter = new RateLimiter({
            interval: 60000,
            uniqueTokenPerInterval: 100
        })
        const check = limiter.getCheck()

        // Token A uses up limit
        await check(2, 'token-a')
        await check(2, 'token-a')
        await expect(check(2, 'token-a')).rejects.toThrow('Rate limit exceeded')

        // Token B should still work
        await expect(check(2, 'token-b')).resolves.toBeUndefined()
        await expect(check(2, 'token-b')).resolves.toBeUndefined()
    })

    it('should reset count after interval', async () => {
        vi.useFakeTimers()

        const limiter = new RateLimiter({
            interval: 1000, // 1 second
            uniqueTokenPerInterval: 100
        })
        const check = limiter.getCheck()

        // Use up the limit
        await check(2, 'token-reset')
        await check(2, 'token-reset')
        await expect(check(2, 'token-reset')).rejects.toThrow('Rate limit exceeded')

        // Advance time past the interval
        vi.advanceTimersByTime(1500)

        // Should work again after reset
        await expect(check(2, 'token-reset')).resolves.toBeUndefined()

        vi.useRealTimers()
    })

    it('should handle limit of 1', async () => {
        const limiter = new RateLimiter({
            interval: 60000,
            uniqueTokenPerInterval: 100
        })
        const check = limiter.getCheck()

        await expect(check(1, 'strict-token')).resolves.toBeUndefined()
        await expect(check(1, 'strict-token')).rejects.toThrow('Rate limit exceeded')
    })
})
