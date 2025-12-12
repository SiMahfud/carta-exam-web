import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiHandler, ApiError } from '../api-handler'
import { z } from 'zod'

// Mock NextResponse
vi.mock('next/server', () => ({
    NextResponse: {
        json: vi.fn((data, options) => ({
            data,
            status: options?.status || 200,
        })),
    },
}))

interface MockNextResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    status: number;
}

describe('api-handler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('ApiError', () => {
        it('should create error with message and default status', () => {
            const error = new ApiError('Test error')
            expect(error.message).toBe('Test error')
            expect(error.status).toBe(500)
        })

        it('should create error with custom status', () => {
            const error = new ApiError('Not found', 404)
            expect(error.message).toBe('Not found')
            expect(error.status).toBe(404)
        })

        it('should extend Error class', () => {
            const error = new ApiError('Test')
            expect(error).toBeInstanceOf(Error)
        })
    })

    describe('apiHandler', () => {
        it('should wrap successful response in data object', async () => {
            const handler = async () => ({ id: 1, name: 'Test' })
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.data).toEqual({
                data: { id: 1, name: 'Test' }
            })
        })

        it('should pass through response with data property', async () => {
            const handler = async () => ({
                data: [1, 2, 3],
                metadata: { total: 3 }
            })
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.data.data).toEqual([1, 2, 3])
            expect(json.data.metadata).toEqual({ total: 3 })
        })

        it('should handle ApiError with custom status', async () => {
            const handler = async () => {
                throw new ApiError('Bad request', 400)
            }
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.status).toBe(400)
            expect(json.data.error).toBe('Bad request')
        })

        it('should handle generic errors with 500 status', async () => {
            const handler = async () => {
                throw new Error('Something went wrong')
            }
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.status).toBe(500)
            expect(json.data.error).toBe('Something went wrong')
        })

        it('should handle ZodError with validation details', async () => {
            const schema = z.object({ name: z.string() })
            const handler = async () => {
                schema.parse({ name: 123 }) // Will throw ZodError
                return {}
            }
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.status).toBe(400)
            expect(json.data.error).toBe('Validation Error')
            expect(json.data.details).toBeDefined()
        })

        it('should handle null/undefined results', async () => {
            const handler = async () => null
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.data.data).toBeNull()
        })

        it('should handle array results', async () => {
            const handler = async () => [1, 2, 3]
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.data.data).toEqual([1, 2, 3])
        })

        it('should handle empty object results', async () => {
            const handler = async () => ({})
            const response = await apiHandler(handler)
            const json = response as unknown as MockNextResponse

            expect(json.data.data).toEqual({})
        })
    })
})
