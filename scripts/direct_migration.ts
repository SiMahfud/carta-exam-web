import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
    try {
        console.log("Adding html_title column...");
        try {
            await db.execute(sql`ALTER TABLE school_settings ADD COLUMN html_title VARCHAR(255) DEFAULT 'CartaExam'`);
            console.log("html_title added.");
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("html_title already exists.");
            } else {
                throw e;
            }
        }

        console.log("Adding favicon_url column...");
        try {
            await db.execute(sql`ALTER TABLE school_settings ADD COLUMN favicon_url VARCHAR(500)`);
            console.log("favicon_url added.");
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("favicon_url already exists.");
            } else {
                throw e;
            }
        }

        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}
run();
