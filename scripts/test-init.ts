import fs from 'fs';
import path from 'path';

const testDbPath = path.resolve(process.cwd(), 'test-init.db');
const testDbUrl = `file:${testDbPath}`;

// Set env vars BEFORE importing db
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = testDbUrl;

// Clean up existing test db if any
if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
}

async function runTest() {
    try {
        console.log("Starting auto-setup test...");

        // Dynamic import to ensure env vars are picked up by the modules
        const { initializeDatabase } = await import('../src/lib/init-db');
        const { db } = await import('../src/lib/db');
        const { users } = await import('../src/lib/schema');
        const { sql } = await import('drizzle-orm');

        // Run initialization
        await initializeDatabase();

        // Verify
        const result = await db.select({ count: sql<number>`count(*)` }).from(users);
        const count = Number(result[0]?.count || 0);

        if (count === 1) {
            console.log("SUCCESS: Admin user created.");
        } else {
            console.error(`FAILURE: Expected 1 user, found ${count}`);
            process.exit(1);
        }

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
            console.log("Test DB cleaned up.");
        }
    }
}

runTest();
