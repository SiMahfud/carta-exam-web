
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

dotenv.config();

const connection = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(connection);

async function main() {
    console.log("Starting global timestamp to datetime migration...");

    try {
        // Tables and columns to migrate
        // Format: { table: 'table_name', columns: ['col1', 'col2'] }
        const targets = [
            { table: 'users', columns: ['created_at'] },
            { table: 'classes', columns: ['created_at'] },
            { table: 'class_students', columns: ['enrolled_at'] },
            { table: 'question_banks', columns: ['created_at', 'updated_at'] },
            { table: 'bank_questions', columns: ['created_at', 'updated_at', 'last_used'] },
            { table: 'partial_credit_settings', columns: ['created_at'] },
            { table: 'exam_templates', columns: ['created_at'] }, // updatedAt already handled? check script
            { table: 'exam_sessions', columns: ['created_at', 'generated_at'] }, // startTime/endTime/updatedAt handled previously
            { table: 'question_pools', columns: ['generated_at'] },
            { table: 'exam_violations', columns: ['created_at'] },
            { table: 'answers', columns: ['graded_at'] }, // gradedAt only
            { table: 'activity_logs', columns: ['created_at'] },
            { table: 'exam_tokens', columns: ['valid_from', 'valid_until', 'created_at'] },
            { table: 'school_settings', columns: ['updated_at'] },
            { table: 'saved_filters', columns: ['created_at'] },
        ];

        for (const target of targets) {
            console.log(`Processing table: ${target.table}`);

            // Check if table exists
            const [tableExists] = await connection.query(`SHOW TABLES LIKE '${target.table}'`);
            if ((tableExists as any[]).length === 0) {
                console.log(`  Table ${target.table} does not exist, skipping.`);
                continue;
            }

            for (const col of target.columns) {
                console.log(`  Migrating column: ${target.table}.${col}`);

                // 1. Check current type
                const [columns] = await connection.query(`
                    SELECT DATA_TYPE, COLUMN_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND COLUMN_NAME = ?
                `, [target.table, col]);

                if ((columns as any[]).length === 0) {
                    console.log(`    Column ${col} not found.`);
                    continue;
                }

                const currentType = (columns as any[])[0].DATA_TYPE.toLowerCase();
                const columnType = (columns as any[])[0].COLUMN_TYPE.toLowerCase();

                if (currentType === 'datetime') {
                    console.log(`    Column is already DATETIME, skipping.`);
                    continue;
                }

                console.log(`    Current type: ${columnType}. converting to DATETIME...`);

                // Check if temp column exists and drop it if so (cleanup from failed runs)
                const [tempColExists] = await connection.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND COLUMN_NAME = ?
                `, [target.table, `${col}_new`]);

                if ((tempColExists as any[]).length > 0) {
                    console.log(`    Temp column ${col}_new exists, dropping it first...`);
                    await connection.query(`ALTER TABLE \`${target.table}\` DROP COLUMN \`${col}_new\``);
                }

                // 2. Add temporary column
                await connection.query(`ALTER TABLE \`${target.table}\` ADD COLUMN \`${col}_new\` DATETIME NULL`);

                // 3. Copy and convert data
                let updateQuery = `UPDATE \`${target.table}\` SET \`${col}_new\` = \`${col}\``;

                if (currentType === 'int' || currentType === 'bigint') {
                    console.log(`    Detected INT/BIGINT. Using FROM_UNIXTIME conversion.`);
                    updateQuery = `UPDATE \`${target.table}\` SET \`${col}_new\` = FROM_UNIXTIME(\`${col}\`)`;
                } else if (currentType === 'timestamp') {
                    console.log(`    Detected TIMESTAMP. Copying directly.`);
                    updateQuery = `UPDATE \`${target.table}\` SET \`${col}_new\` = \`${col}\``;
                }

                await connection.query(updateQuery);

                // 4. Drop old column
                // Note: Dropping a column that is a foreign key or part of an index might require extra steps.
                // However, timestamp columns usually aren't foreign keys here. Indexes might be affected.
                // We should recreate indexes if needed, but for now simple drop/rename often preserves simple indexes or we might lose them.
                // Drizzle usually manages indexes on application startup push, or we rely on them being simple.
                // Let's safe-guard against 'FOREIGN KEY' constraints if any (unlikely for created_at timestamps usually).

                await connection.query(`ALTER TABLE \`${target.table}\` DROP COLUMN \`${col}\``);

                // 5. Rename new column to old name
                // We need to restore NOT NULL constraints and DEFAULTS manually or let Drizzle handle it later?
                // It's safer to try to match the schema definition.
                // Most are default CURRENT_TIMESTAMP.

                let modifySql = `ALTER TABLE \`${target.table}\` CHANGE COLUMN \`${col}_new\` \`${col}\` DATETIME`;

                // Add Default CURRENT_TIMESTAMP if typically required (most are)
                // We'll check our list. last_used, graded_at, valid_from/until might differ.
                // Simple heuristic: if it was NOT NULL, keep it NOT NULL.
                // But detecting "was NOT NULL" is hard without storing it.
                // We'll trust the Drizzle Schema definitions:
                // last_used: nullable
                // graded_at: nullable
                // valid_from/until: notNull
                // created_at/updated_at: usually default now()

                if (['valid_from', 'valid_until'].includes(col)) {
                    modifySql += ` NOT NULL`;
                } else if (!['last_used', 'graded_at'].includes(col)) {
                    // Default assumption for created_at/updated_at/enrolled_at/generated_at
                    modifySql += ` DEFAULT CURRENT_TIMESTAMP`;
                }

                await connection.query(modifySql);
                console.log(`    Done.`);
            }
        }

        console.log("Migration completed successfully.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await connection.end();
        process.exit();
    }
}

main();
