import { db } from "../src/lib/db";
import { users } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function testConnection() {
    try {
        console.log("Testing database connection...");
        const result = await db.select({ count: sql<number>`count(*)` }).from(users);
        console.log("Connection successful! User count:", result[0].count);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    }
}

testConnection();
