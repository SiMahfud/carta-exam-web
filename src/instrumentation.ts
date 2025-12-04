export async function register() {
    console.log('[Instrumentation] Registering...');
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { initializeDatabase } = await import('./lib/init-db');
            await initializeDatabase();
        } catch (error) {
            console.error('Failed to initialize database during startup:', error);
        }
    }
}
