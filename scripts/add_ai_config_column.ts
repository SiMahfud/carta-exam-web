import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
    const dbType = process.env.DB_TYPE || 'sqlite';
    console.log(`Adding ai_config column to school_settings (DB: ${dbType})...`);

    try {
        if (dbType === 'mysql') {
            try {
                await (db as any).execute(sql`ALTER TABLE school_settings ADD COLUMN ai_config JSON DEFAULT NULL`);
                console.log("ai_config column added (MySQL).");
            } catch (e: any) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log("ai_config column already exists.");
                } else {
                    throw e;
                }
            }
        } else if (dbType === 'postgres') {
            try {
                await (db as any).execute(sql`ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT NULL`);
                console.log("ai_config column added (PostgreSQL).");
            } catch (e: any) {
                console.log("Column may already exist or error:", e.message);
            }
        } else {
            // SQLite
            try {
                await (db as any).execute(sql`ALTER TABLE school_settings ADD COLUMN ai_config TEXT DEFAULT NULL`);
                console.log("ai_config column added (SQLite).");
            } catch (e: any) {
                if (e.message?.includes('duplicate column')) {
                    console.log("ai_config column already exists.");
                } else {
                    throw e;
                }
            }
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

run();
