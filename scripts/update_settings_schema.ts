
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
    console.log("Adding announcement columns to school_settings via direct MySQL connection...");

    // Construct connection string or params explicitly to verify we have them
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASS;
    const database = process.env.DB_NAME;
    const port = parseInt(process.env.DB_PORT || '3306');

    if (!host || !user || !database) {
        console.error("Missing DB environment variables (DB_HOST, DB_USER, DB_NAME, DB_PASS).");
        console.error("Current env keys:", Object.keys(process.env).filter(k => k.startsWith('DB_')));
        process.exit(1);
    }

    try {
        const connection = await mysql.createConnection({
            host, user, password, database, port
        });

        console.log(`Connected to ${database} at ${host}`);

        // Run the ALTER TABLE query
        // We use try/catch for "Duplicate column" error handling if wanted, 
        // but MySQL threw error on 'Unknown column' before, so we assume they don't exist.
        // If they exist, this will throw.
        try {
            await connection.execute(`
                ALTER TABLE school_settings 
                ADD COLUMN announcement_title varchar(255) DEFAULT NULL,
                ADD COLUMN announcement_content text DEFAULT NULL
            `);
            console.log("Successfully added columns.");
        } catch (err: any) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("Columns already exist, skipping.");
            } else {
                throw err;
            }
        }

        await connection.end();
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

main();
