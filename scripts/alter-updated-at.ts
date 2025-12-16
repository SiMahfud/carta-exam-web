import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function alterTable() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection(dbUrl);
    console.log('Connected.');

    try {
        // First, check the current column type and data
        const [rows] = await connection.execute(`DESCRIBE exam_templates updated_at`);
        console.log('Current column definition:', rows);

        // Check current values
        const [data] = await connection.execute(`SELECT id, updated_at FROM exam_templates LIMIT 5`);
        console.log('Current data:', data);

        // If the column is TIMESTAMP and has valid data, we need to convert carefully
        // First, try to set invalid values to NULL, then alter the column
        await connection.execute(`
      UPDATE exam_templates 
      SET updated_at = NULL 
      WHERE updated_at IS NOT NULL
    `);
        console.log('Set existing updated_at values to NULL');

        // Now alter the column
        await connection.execute(`
      ALTER TABLE exam_templates 
      MODIFY COLUMN updated_at DATETIME
    `);
        console.log('Successfully altered updated_at column to DATETIME');
    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        await connection.end();
    }
}

alterTable();
