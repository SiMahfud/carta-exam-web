
import * as dotenv from 'dotenv';
dotenv.config();
import { sql } from 'drizzle-orm';
// import { db } from '../src/lib/db'; // Removed static import

async function verifyConnection() {
    console.log("Verifying database connection...");

    // Dynamic import to ensure process.env is populated
    const { db } = await import('../src/lib/db');

    // Check if db is initialized
    if (!db) {
        console.error("Database instance is undefined!");
        process.exit(1);
    }

    try {
        console.log(`DB_TYPE is: ${process.env.DB_TYPE}`);

        if (process.env.DB_TYPE === 'mysql') {
            console.log("Attempting MySQL query...");
            // @ts-ignore
            const result = await db.execute(sql`SELECT 1 as val`);
            console.log("MySQL connection successful!", result);
        } else if (process.env.DB_TYPE === 'postgres') {
            console.log("Attempting Postgres query...");
            // @ts-ignore
            const result = await db.execute(sql`SELECT 1 as val`);
            console.log("Postgres connection successful!", result);
        } else {
            console.log("Attempting SQLite query...");
            // @ts-ignore
            const result = await db.run(sql`SELECT 1 as val`);
            console.log("SQLite connection successful!", result);
        }

        process.exit(0);
    } catch (error) {
        console.error("Database connection failed:", error);

        if (db) {
            const proto = Object.getPrototypeOf(db);
            console.log("DB Prototype:", proto ? proto.constructor.name : "Unknown");
        }

        process.exit(1);
    }
}

verifyConnection();
