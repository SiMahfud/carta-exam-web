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
        // Check current column types
        const [columns] = await connection.execute(`DESCRIBE exam_sessions`);
        console.log('Current columns:', columns);

        // First, we need to temporarily allow NULL values, then set to valid datetime
        // Convert unix timestamps to datetime values
        console.log('Converting start_time from unix timestamp to datetime...');

        // Check if column is INT type (unix timestamp)
        const startTimeCol = (columns as any[]).find((c: any) => c.Field === 'start_time');
        const endTimeCol = (columns as any[]).find((c: any) => c.Field === 'end_time');

        console.log('start_time type:', startTimeCol?.Type);
        console.log('end_time type:', endTimeCol?.Type);

        if (startTimeCol?.Type?.toLowerCase().includes('int')) {
            // It's storing unix timestamps - convert them
            console.log('Converting unix timestamp columns to DATETIME...');

            // Add temporary columns
            await connection.execute(`ALTER TABLE exam_sessions ADD COLUMN start_time_new DATETIME`);
            await connection.execute(`ALTER TABLE exam_sessions ADD COLUMN end_time_new DATETIME`);

            // Convert data
            await connection.execute(`UPDATE exam_sessions SET start_time_new = FROM_UNIXTIME(start_time)`);
            await connection.execute(`UPDATE exam_sessions SET end_time_new = FROM_UNIXTIME(end_time)`);

            // Drop old columns
            await connection.execute(`ALTER TABLE exam_sessions DROP COLUMN start_time`);
            await connection.execute(`ALTER TABLE exam_sessions DROP COLUMN end_time`);

            // Rename new columns
            await connection.execute(`ALTER TABLE exam_sessions CHANGE start_time_new start_time DATETIME NOT NULL`);
            await connection.execute(`ALTER TABLE exam_sessions CHANGE end_time_new end_time DATETIME NOT NULL`);

            console.log('Successfully converted columns to DATETIME');
        } else {
            // Already datetime/timestamp - just alter the type
            await connection.execute(`ALTER TABLE exam_sessions MODIFY COLUMN start_time DATETIME NOT NULL`);
            await connection.execute(`ALTER TABLE exam_sessions MODIFY COLUMN end_time DATETIME NOT NULL`);
            console.log('Successfully altered columns to DATETIME');
        }
    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        await connection.end();
    }
}

alterTable();
