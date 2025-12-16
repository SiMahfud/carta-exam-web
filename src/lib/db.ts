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

const provider = process.env.DATABASE_PROVIDER || 'sqlite';
const dbUrl = process.env.DATABASE_URL || 'file:local.db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let schema: any;

if (provider === 'mysql') {
    const connection = mysql.createPool(dbUrl);
    schema = schemaMysql;
    db = drizzleMysql(connection, { schema, mode: 'default' });
} else if (provider === 'postgres') {
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
