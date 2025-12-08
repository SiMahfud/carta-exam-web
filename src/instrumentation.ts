import * as Sentry from "@sentry/nextjs";

export async function register() {
    console.log('[Instrumentation] Registering...');

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Initialize Sentry for Node.js runtime
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            await import("../sentry.server.config");
        }

        // Initialize database
        try {
            const { initializeDatabase } = await import('./lib/init-db');
            await initializeDatabase();
        } catch (error) {
            console.error('Failed to initialize database during startup:', error);
            Sentry.captureException(error);
        }
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Initialize Sentry for Edge runtime
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            await import("../sentry.edge.config");
        }
    }
}

// Sentry error handler for request errors
export const onRequestError = Sentry.captureRequestError;
