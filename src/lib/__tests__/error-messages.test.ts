import { describe, it, expect } from 'vitest'
import { getErrorInfo, formatApiError } from '../error-messages'

describe('error-messages', () => {
    describe('getErrorInfo', () => {
        it('should return info for known error code string', () => {
            const result = getErrorInfo('AUTH_INVALID_CREDENTIALS')
            expect(result.title).toBe('Login Gagal')
            expect(result.description).toContain('Email atau password')
        })

        it('should extract error code from bracketed message', () => {
            const result = getErrorInfo('[AUTH_UNAUTHORIZED] Access denied')
            expect(result.title).toBe('Akses Ditolak')
        })

        it('should handle Error object with bracketed message', () => {
            const error = new Error('[EXAM_ENDED] Time is up')
            const result = getErrorInfo(error)
            expect(result.title).toBe('Ujian Telah Berakhir')
        })

        it('should handle object with code property', () => {
            const error = { code: 'NOT_FOUND', message: 'Item not found' }
            const result = getErrorInfo(error)
            expect(result.title).toBe('Data Tidak Ditemukan')
        })

        it('should handle object with error property', () => {
            const error = { error: 'DUPLICATE_ENTRY' }
            const result = getErrorInfo(error)
            expect(result.title).toBe('Data Sudah Ada')
        })

        it('should return UNKNOWN_ERROR for unrecognized strings', () => {
            const result = getErrorInfo('some random error message')
            expect(result.title).toBe('Terjadi Kesalahan')
        })

        it('should detect network errors from TypeError', () => {
            const error = new TypeError('Failed to fetch')
            const result = getErrorInfo(error)
            expect(result.title).toBe('Koneksi Bermasalah')
        })

        it('should return UNKNOWN_ERROR for null/undefined', () => {
            const result1 = getErrorInfo(null)
            const result2 = getErrorInfo(undefined)
            expect(result1.title).toBe('Terjadi Kesalahan')
            expect(result2.title).toBe('Terjadi Kesalahan')
        })

        it('should include action for errors that have it', () => {
            const result = getErrorInfo('AUTH_SESSION_EXPIRED')
            expect(result.action).toBeDefined()
            expect(result.action?.label).toBe('Login')
            expect(result.action?.href).toBe('/login')
        })
    })

    describe('formatApiError', () => {
        it('should format response with known code', () => {
            const response = { code: 'VALIDATION_ERROR', message: 'Invalid data' }
            const result = formatApiError(response)
            expect(result.title).toBe('Data Tidak Valid')
        })

        it('should format response with known error', () => {
            const response = { error: 'EXAM_NOT_STARTED' }
            const result = formatApiError(response)
            expect(result.title).toBe('Ujian Belum Dimulai')
        })

        it('should use message for unknown errors', () => {
            const response = { message: 'Something went wrong' }
            const result = formatApiError(response)
            expect(result.title).toBe('Terjadi Kesalahan')
            expect(result.description).toBe('Something went wrong')
        })

        it('should use error as fallback description', () => {
            const response = { error: 'custom_error_not_mapped' }
            const result = formatApiError(response)
            expect(result.description).toBe('custom_error_not_mapped')
        })

        it('should handle empty response', () => {
            const response = {}
            const result = formatApiError(response)
            expect(result.title).toBe('Terjadi Kesalahan')
            expect(result.description).toBe('Silakan coba lagi.')
        })

        it('should prioritize code over error', () => {
            const response = { code: 'FILE_TOO_LARGE', error: 'NETWORK_ERROR' }
            const result = formatApiError(response)
            expect(result.title).toBe('File Terlalu Besar')
        })
    })
})
