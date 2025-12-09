import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    test: {
        environment: 'happy-dom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        globals: true,
        reporters: ['default', 'junit'],
        outputFile: 'junit-report.xml',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            thresholds: {
                lines: 50,
                functions: 50,
                branches: 50,
                statements: 50
            },
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
