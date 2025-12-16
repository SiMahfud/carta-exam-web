import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import postgres from 'postgres';
import path from 'path';

// Load schemas (we need to load all of them or dynamically require them)
// Since we are in ES modules (likely), dynamic require might be tricky without createRequire.
// However, standard import is static. 
// For better type safety, we might need a unified schema interface, but Drizzle doesn't support that easily.
// We will import them as namespaces.
import * as schemaSqlite from './schemas/sqlite';
import * as schemaMysql from './schemas/mysql';
import * as schemaPg from './schemas/postgresql';


const provider = process.env.DB_TYPE || 'sqlite';

// Construct DB URL from parts if not provided directly
// This allows for DB_HOST, DB_USER, etc.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let schema: any;

if (provider === 'mysql' || process.env.DB_TYPE === 'mysql') {
    // Ensure dateStrings is true for Drizzle compatibility with datetime columns
    let connectionUri = dbUrl;
    try {
        const url = new URL(dbUrl);
        url.searchParams.set('dateStrings', 'true');
        connectionUri = url.toString();
    } catch {
        // Fallback for non-standard URIs (though unlikely for valid mysql connection strings)
        connectionUri = dbUrl.includes('?') ? `${dbUrl}&dateStrings=true` : `${dbUrl}?dateStrings=true`;
    }
    const connection = mysql.createPool(connectionUri);
    schema = schemaMysql;
    db = drizzleMysql(connection, { schema, mode: 'default' });
} else if (provider === 'postgres' || process.env.DB_TYPE === 'postgres') {
    const client = postgres(dbUrl);
    schema = schemaPg;
    db = drizzlePg(client, { schema });
} else {
    // Default to SQLite
    const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : 'local.db';
    const sqlite = new Database(path.resolve(process.cwd(), dbPath));
    schema = schemaSqlite;
    db = drizzleSqlite(sqlite, { schema });
}

export { db, schema };
