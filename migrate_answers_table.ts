import Database from "better-sqlite3";

const db = new Database("./local.db");

try {
    // Disable foreign keys to allow dropping table
    db.pragma('foreign_keys = OFF');

    console.log("Adding bank_question_id column to answers table...");

    // Add the new column (ignore if exists)
    try {
        db.exec(`
            ALTER TABLE answers 
            ADD COLUMN bank_question_id TEXT 
            REFERENCES bank_questions(id) ON DELETE CASCADE;
        `);
        console.log("✓ Column added successfully!");
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log("ℹ Column bank_question_id already exists, skipping...");
        } else {
            console.log("ℹ Could not add column (might already exist or other error):", e.message);
        }
    }

    // Make questionId nullable by recreating table
    console.log("\nMaking questionId nullable...");

    // Backup data
    db.exec(`DROP TABLE IF EXISTS answers_backup;`);
    db.exec(`CREATE TABLE answers_backup AS SELECT * FROM answers;`);

    // Drop old table
    db.exec(`DROP TABLE answers;`);

    // Recreate with nullable questionId
    db.exec(`
        CREATE TABLE answers (
            id TEXT PRIMARY KEY,
            submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
            bank_question_id TEXT REFERENCES bank_questions(id) ON DELETE CASCADE,
            student_answer TEXT,
            is_flagged INTEGER DEFAULT 0,
            is_correct INTEGER,
            score INTEGER DEFAULT 0,
            max_points INTEGER,
            partial_points INTEGER,
            grading_status TEXT DEFAULT 'auto',
            graded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            graded_at INTEGER,
            grading_notes TEXT
        );
    `);

    // Restore data if any exists
    const hasData = db.prepare("SELECT COUNT(*) as count FROM answers_backup").get() as { count: number };
    if (hasData.count > 0) {
        // Get columns from backup to ensure we only insert matching columns
        const backupColumns = (db.prepare("PRAGMA table_info(answers_backup)").all() as any[]).map((c: any) => c.name);
        const targetColumns = (db.prepare("PRAGMA table_info(answers)").all() as any[]).map((c: any) => c.name);

        // Intersect columns
        const commonColumns = targetColumns.filter((c: any) => backupColumns.includes(c));
        const columnsStr = commonColumns.join(", ");

        db.exec(`INSERT INTO answers (${columnsStr}) SELECT ${columnsStr} FROM answers_backup;`);
        console.log(`✓ Restored ${hasData.count} records`);
    }

    // Drop backup
    db.exec(`DROP TABLE answers_backup;`);

    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log("✓ Schema updated successfully!");
} catch (error) {
    console.error("Error updating schema:", error);
} finally {
    db.close();
}
