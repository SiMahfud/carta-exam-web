import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

async function runMigration() {
    console.log('Connecting to MySQL...');
    try {
        const connection = await mysql.createConnection(dbUrl!);
        console.log('Connected.');

        console.log('Attempting to add question_number column to bank_questions...');
        try {
            await connection.execute('ALTER TABLE bank_questions ADD COLUMN question_number int DEFAULT 0');
            console.log('Column question_number added successfully.');
        } catch (error: any) {
            // Check for "Duplicate column name" error code (1060)
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Column question_number already exists.');
            } else {
                console.error('Error adding column:', error.message);
                throw error;
            }
        }

        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
