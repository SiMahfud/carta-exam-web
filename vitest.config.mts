import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/lib/**/*.ts'],
            exclude: ['src/lib/__tests__/**', 'src/lib/db.ts', 'src/lib/schema.ts', 'src/lib/seed.ts', 'src/lib/init-db.ts'],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
})
