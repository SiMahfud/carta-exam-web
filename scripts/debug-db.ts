import * as dotenv from 'dotenv';
dotenv.config();
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { subjects } from '../src/lib/schemas/mysql';

async function main() {
    console.log('--- Verifying DB Connection & Schema ---');
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
        console.error('No DATABASE_URL found');
        return;
    }

    // We expect dateStrings to work now (or just formatted dates)
    const connectionUri = dbUrl.includes('?') ? `${dbUrl}&dateStrings=true` : `${dbUrl}?dateStrings=true`;
    console.log('Connecting with dateStrings=true...');

    const connection = mysql.createPool(connectionUri);
    const db = drizzle(connection, { schema: { subjects }, mode: 'default' });

    try {
        console.log('Querying subjects...');
        const result = await db.select().from(subjects).limit(1);
        console.log('Result:', result);
        if (result.length > 0) {
            console.log('createdAt:', result[0].createdAt);
            console.log('Type:', typeof result[0].createdAt);
        }
    } catch (e: any) {
        console.error('Verification Failed:', e.message);
    } finally {
        await connection.end();
    }
}

main();
