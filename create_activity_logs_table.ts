import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use local.db which is the actual database file used by the app
const dbPath = join(__dirname, "local.db");
const db = new Database(dbPath);

console.log("Creating activity_logs table...");

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            created_at INTEGER DEFAULT (unixepoch()),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    `);

    // Create index for faster queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at 
        ON activity_logs(created_at DESC);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
        ON activity_logs(user_id);
    `);

    console.log("✅ activity_logs table created successfully");
    console.log("✅ Indexes created successfully");
} catch (error) {
    console.error("❌ Error creating activity_logs table:", error);
    process.exit(1);
}

db.close();
