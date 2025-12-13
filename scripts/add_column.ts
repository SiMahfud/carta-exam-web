import Database from 'better-sqlite3';
import path from 'path';

const dbPath = 'local.db';
const db = new Database(path.resolve(process.cwd(), dbPath));

try {
    console.log('Attempting to add question_number column...');
    db.prepare('ALTER TABLE bank_questions ADD COLUMN question_number integer DEFAULT 0').run();
    console.log('Column question_number added successfully.');
} catch (error: any) {
    console.log('Error (likely already exists):', error.message);
}
