import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating saved_filters table...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS saved_filters (
                id varchar(36) PRIMARY KEY NOT NULL,
                user_id varchar(36) NOT NULL,
                name text NOT NULL,
                page text NOT NULL,
                filters text NOT NULL,
                is_default boolean DEFAULT false,
                created_at integer DEFAULT (UNIX_TIMESTAMP()),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        // Add indexes separately to ensure compatibility
        try {
            await db.execute(sql`CREATE INDEX IF NOT EXISTS saved_filters_user_idx ON saved_filters (user_id);`);
        } catch (e) {
            console.log("Index saved_filters_user_idx might already exist or error:", e);
        }
        try {
            await db.execute(sql`CREATE INDEX IF NOT EXISTS saved_filters_page_idx ON saved_filters (page);`);
        } catch (e) {
            console.log("Index saved_filters_page_idx might already exist or error:", e);
        }

        console.log("Table saved_filters created successfully!");
    } catch (error) {
        console.error("Error creating table:", error);
    }
    process.exit(0);
}

main();
