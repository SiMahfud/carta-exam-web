import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

async function main() {
    console.log('--- Fixing Subjects Table Schema ---');
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
        console.error('No DATABASE_URL found');
        return;
    }

    const connection = mysql.createPool(dbUrl);

    try {
        console.log('Checking current schema...');
        const [columns] = await connection.query('DESCRIBE subjects');
        const createdAtCol = (columns as any[]).find(c => c.Field === 'created_at');

        if (createdAtCol && createdAtCol.Type.startsWith('int')) {
            console.log('Found created_at as INT. Migrating to DATETIME...');

            // Step 1: Add new column
            console.log('Step 1: Adding created_at_new...');
            await connection.query('ALTER TABLE subjects ADD COLUMN created_at_new DATETIME DEFAULT CURRENT_TIMESTAMP');

            // Step 2: Copy data
            console.log('Step 2: Copying data...');
            await connection.query('UPDATE subjects SET created_at_new = FROM_UNIXTIME(created_at) WHERE created_at IS NOT NULL');
            // Handle nulls if any, though default is current timestamp so existing nulls might remain null or default. 
            // In the integer schema it was nullable. 

            // Step 3: Drop old column
            console.log('Step 3: Dropping old column...');
            await connection.query('ALTER TABLE subjects DROP COLUMN created_at');

            // Step 4: Rename new column
            console.log('Step 4: Renaming column...');
            await connection.query('ALTER TABLE subjects RENAME COLUMN created_at_new TO created_at');

            console.log('Migration successful!');
        } else {
            console.log('created_at is already correct or not found:', createdAtCol?.Type);
        }

    } catch (e: any) {
        console.error('Migration failed:', e.message);
    } finally {
        await connection.end();
    }
}

main();
