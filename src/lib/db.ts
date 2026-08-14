import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql, MySql2Database } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import postgres from 'postgres';
import path from 'path';

// Load schemas
import * as schemaSqlite from './schemas/sqlite';
import * as schemaMysql from './schemas/mysql';
import * as schemaPg from './schemas/postgresql';

export type AppDatabase =
    | BetterSQLite3Database<typeof schemaSqlite>
    | MySql2Database<typeof schemaMysql>
    | PostgresJsDatabase<typeof schemaPg>;

export type AppSchema = typeof schemaSqlite | typeof schemaMysql | typeof schemaPg;

const provider = process.env.DB_TYPE || 'sqlite';

// Construct DB URL from parts if not provided directly
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && process.env.DB_TYPE && process.env.DB_HOST) {
    const type = process.env.DB_TYPE;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const dbName = process.env.DB_NAME;

    if (type === 'mysql') {
        dbUrl = `mysql://${user}:${pass}@${host}:${port}/${dbName}`;
    } else if (type === 'postgres') {
        dbUrl = `postgres://${user}:${pass}@${host}:${port}/${dbName}`;
    } else if (type === 'sqlite') {
        dbUrl = `file:${dbName}`;
    }
}

// Fallback for local dev if nothing is set
if (!dbUrl) {
    dbUrl = 'file:local.db';
}

let dbInstance: AppDatabase;
let schemaInstance: AppSchema;

if (provider === 'mysql' || process.env.DB_TYPE === 'mysql') {
    let connectionUri = dbUrl;
    try {
        const url = new URL(dbUrl);
        url.searchParams.set('dateStrings', 'true');
        connectionUri = url.toString();
    } catch {
        connectionUri = dbUrl.includes('?') ? `${dbUrl}&dateStrings=true` : `${dbUrl}?dateStrings=true`;
    }
    const connection = mysql.createPool(connectionUri);
    schemaInstance = schemaMysql;
    dbInstance = drizzleMysql(connection, { schema: schemaMysql, mode: 'default' });
} else if (provider === 'postgres' || process.env.DB_TYPE === 'postgres') {
    const client = postgres(dbUrl);
    schemaInstance = schemaPg;
    dbInstance = drizzlePg(client, { schema: schemaPg });
} else {
    // Default to SQLite
    const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : 'local.db';
    const sqlite = new Database(path.resolve(process.cwd(), dbPath));
    schemaInstance = schemaSqlite;
    dbInstance = drizzleSqlite(sqlite, { schema: schemaSqlite });
}

export const db = dbInstance as any;
export const schema = schemaInstance as any;
