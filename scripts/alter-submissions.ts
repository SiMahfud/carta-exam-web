import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

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
        const [columns] = await connection.execute(`DESCRIBE submissions`);
        console.log('Current columns:', columns);

        // Columns to migrate: start_time, end_time, created_at
        const colsToMigrate = ['start_time', 'end_time', 'created_at'];

        for (const colName of colsToMigrate) {
            console.log(`Processing column ${colName}...`);

            // Add temporary column
            await connection.execute(`ALTER TABLE submissions ADD COLUMN ${colName}_new DATETIME`);

            // Convert data (handle existing timestamps vs int)
            // If it was timestamp type, it might auto-convert or need specific handling. 
            // If it was INT (unix timestamp), we need FROM_UNIXTIME.

            // Check column type from description
            const colDef = (columns as any[]).find((c: any) => c.Field === colName);
            if (colDef && colDef.Type.toLowerCase().includes('int')) {
                console.log(`Converting ${colName} from INT...`);
                await connection.execute(`UPDATE submissions SET ${colName}_new = FROM_UNIXTIME(${colName}) WHERE ${colName} IS NOT NULL`);
            } else {
                console.log(`Converting ${colName} from TIMESTAMP/DATETIME...`);
                // For timestamp/datetime, direct copy works usually, or use CAST
                await connection.execute(`UPDATE submissions SET ${colName}_new = ${colName}`);
            }

            // Drop old column
            await connection.execute(`ALTER TABLE submissions DROP COLUMN ${colName}`);

            // Rename new column
            // Restore default for start_time if needed, but for now just DATETIME
            let defaultClause = '';
            if (colName === 'start_time' || colName === 'created_at') {
                // We can't use CURRENT_TIMESTAMP for DATETIME easily in all versions without configuration
                // But schema uses $defaultFn, so DB default might not be strictly necessary if app handles it.
                // Let's just set nullable or not null based on previous state
            }

            const nullClause = colDef?.Null === 'NO' ? 'NOT NULL' : 'NULL';
            await connection.execute(`ALTER TABLE submissions CHANGE ${colName}_new ${colName} DATETIME ${nullClause}`);
            console.log(`Finished ${colName}.`);
        }

        console.log('Successfully altered submissions table.');
    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        await connection.end();
    }
}

alterTable();
