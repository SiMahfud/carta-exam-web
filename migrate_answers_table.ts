import Database from "better-sqlite3";

const db = new Database("./local.db");

try {
    console.log("Adding bank_question_id column to answers table...");

    // Add the new column
    db.exec(`
        ALTER TABLE answers 
        ADD COLUMN bank_question_id TEXT 
        REFERENCES bank_questions(id) ON DELETE CASCADE;
    `);

    console.log("✓ Column added successfully!");

    // Make questionId nullable by recreating table
    console.log("\nMaking questionId nullable...");

    // Backup data
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
    const hasData = db.prepare("SELECT COUNT(*) as count FROM answers_backup").get();
    if (hasData.count > 0) {
        db.exec(`INSERT INTO answers SELECT * FROM answers_backup;`);
        console.log(`✓ Restored ${hasData.count} records`);
    }

    // Drop backup
    db.exec(`DROP TABLE answers_backup;`);

    console.log("✓ Schema updated successfully!");
} catch (error) {
    console.error("Error updating schema:", error);
} finally {
    db.close();
}
