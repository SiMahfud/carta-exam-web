// Migration script for CartaExam
// Run with: npm run migrate

import * as dotenv from 'dotenv';
dotenv.config();

const provider = process.env.DB_TYPE || 'sqlite';
let rawDbUrl: string | undefined = process.env.DATABASE_URL;

if (!rawDbUrl && process.env.DB_TYPE && process.env.DB_HOST) {
    const type = process.env.DB_TYPE;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const dbName = process.env.DB_NAME;

    if (type === 'mysql') {
        rawDbUrl = `mysql://${user}:${pass}@${host}:${port}/${dbName}`;
    } else if (type === 'postgres') {
        rawDbUrl = `postgres://${user}:${pass}@${host}:${port}/${dbName}`;
    } else if (type === 'sqlite') {
        rawDbUrl = `file:${dbName}`;
    }
}

const dbUrl: string = rawDbUrl || 'file:local.db';

interface MigrationColumn {
    table: string;
    column: string;
    type: string;
    mysqlType?: string;  // Override type for MySQL
    defaultValue?: string;
    updateExisting?: string;  // SQL to run after adding column for existing rows
}

const DEFAULT_VIOLATION_SETTINGS = JSON.stringify({
    detectTabSwitch: true,
    detectCopyPaste: true,
    detectRightClick: true,
    detectScreenshot: true,
    detectDevTools: true,
    cooldownSeconds: 5,
    mode: "strict"
});

const MIGRATIONS: MigrationColumn[] = [
    // Previous migration
    { table: 'submissions', column: 'bonus_time_minutes', type: 'INTEGER', defaultValue: '0' },
    // New migrations for violation settings and token
    {
        table: 'exam_templates',
        column: 'violation_settings',
        type: 'TEXT',
        // No default for MySQL TEXT, we update existing rows after
        updateExisting: `UPDATE exam_templates SET violation_settings = '${DEFAULT_VIOLATION_SETTINGS}' WHERE violation_settings IS NULL`
    },
    { table: 'exam_sessions', column: 'access_token', type: 'VARCHAR(10)', mysqlType: 'VARCHAR(10)' },
    // Device binding migration
    { table: 'submissions', column: 'device_id', type: 'TEXT', mysqlType: 'VARCHAR(64)' },
];

async function runMigration() {
    console.log(`🔄 Running migration for ${provider.toUpperCase()} database...`);
    console.log('📝 Migrations: bonus_time_minutes, violation_settings, access_token\n');

    try {
        if (provider === 'mysql') {
            const mysql = await import('mysql2/promise');
            const connection = await mysql.createConnection(dbUrl);

            for (const migration of MIGRATIONS) {
                // Check if column exists
                const [rows] = await connection.execute(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() 
                     AND TABLE_NAME = '${migration.table}' 
                     AND COLUMN_NAME = '${migration.column}'`
                );

                if ((rows as any[]).length > 0) {
                    console.log(`✅ Column ${migration.table}.${migration.column} already exists. Skipping...`);
                } else {
                    const colType = migration.mysqlType || migration.type;
                    // For TEXT columns in MySQL, don't add default. Use updateExisting instead.
                    const isTextType = colType.toUpperCase() === 'TEXT';
                    const defaultClause = (migration.defaultValue && !isTextType) ? ` DEFAULT ${migration.defaultValue}` : '';

                    await connection.execute(
                        `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${colType}${defaultClause}`
                    );
                    console.log(`✅ Column ${migration.table}.${migration.column} added successfully!`);

                    // Run update for existing rows if specified
                    if (migration.updateExisting) {
                        await connection.execute(migration.updateExisting);
                        console.log(`   📝 Updated existing rows with default values`);
                    }
                }
            }

            await connection.end();

        } else if (provider === 'postgres') {
            const pg = await import('postgres');
            const sql = pg.default(dbUrl);

            for (const migration of MIGRATIONS) {
                const result = await sql`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = ${migration.table}
                    AND column_name = ${migration.column}
                `;

                if (result.length > 0) {
                    console.log(`✅ Column ${migration.table}.${migration.column} already exists. Skipping...`);
                } else {
                    const defaultClause = migration.defaultValue ? ` DEFAULT '${migration.defaultValue}'` : '';
                    await sql.unsafe(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}${defaultClause}`);
                    console.log(`✅ Column ${migration.table}.${migration.column} added successfully!`);

                    if (migration.updateExisting) {
                        await sql.unsafe(migration.updateExisting);
                        console.log(`   📝 Updated existing rows with default values`);
                    }
                }
            }

            await sql.end();

        } else {
            // SQLite
            const Database = (await import('better-sqlite3')).default;
            const path = await import('path');

            const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : 'local.db';
            const sqlite = new Database(path.resolve(process.cwd(), dbPath));

            for (const migration of MIGRATIONS) {
                const columns = sqlite.prepare(`PRAGMA table_info(${migration.table})`).all() as any[];
                const columnExists = columns.some(col => col.name === migration.column);

                if (columnExists) {
                    console.log(`✅ Column ${migration.table}.${migration.column} already exists. Skipping...`);
                } else {
                    const defaultClause = migration.defaultValue ? ` DEFAULT ${migration.defaultValue}` : '';
                    sqlite.exec(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}${defaultClause}`);
                    console.log(`✅ Column ${migration.table}.${migration.column} added successfully!`);

                    if (migration.updateExisting) {
                        sqlite.exec(migration.updateExisting);
                        console.log(`   📝 Updated existing rows with default values`);
                    }
                }
            }

            sqlite.close();
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('📌 You can now restart the dev server with: npm run dev');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
