import { db } from "./db";
import { users } from "./schema";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import path from "path";

export async function initializeDatabase() {
    const provider = process.env.DB_TYPE || "sqlite";
    const migrationsFolder = path.join(process.cwd(), "drizzle");

    console.log(`[Init] Initializing database for provider: ${provider}...`);

    try {
        // 0. Ensure Database Exists (MySQL only)
        if (provider === "mysql") {
            const dbUrl = process.env.DATABASE_URL;
            if (dbUrl) {
                try {
                    const url = new URL(dbUrl);
                    const dbName = url.pathname.slice(1);
                    const mysql = await import("mysql2/promise");

                    const connection = await mysql.createConnection({
                        host: url.hostname,
                        user: url.username,
                        password: url.password,
                        port: Number(url.port) || 3306,
                    });

                    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
                    await connection.end();
                    console.log(`[Init] Database '${dbName}' checked/created.`);
                } catch (err) {
                    console.error("[Init] Error creating MySQL database:", err);
                }
            }
        }

        // 1. Check if schema already pushed (e.g. via `npm run db:push`)
        let schemaReady = false;
        try {
            await db.select({ count: sql<number>`count(*)` }).from(users);
            schemaReady = true;
        } catch {
            schemaReady = false;
        }

        if (!schemaReady) {
            if (provider === "sqlite") {
                console.log("[Init] Running SQLite migrations...");
                await migrateSqlite(db, { migrationsFolder });
                console.log("[Init] SQLite migrations completed.");
            } else {
                console.warn(`[Init] Database tables not found for ${provider}. Please run "npm run db:push" first.`);
                return;
            }
        }

        // 2. Check if seeding is needed
        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        const count = Number(userCount[0]?.count || 0);

        if (count === 0) {
            console.log("[Init] Database appears empty. Seeding initial data...");

            const adminPasswordHash = await bcrypt.hash("password123", 10);
            const studentPasswordHash = await bcrypt.hash("password123", 10);

            // Create default admin user
            await db.insert(users).values({
                name: "Administrator",
                username: "admin",
                password: adminPasswordHash,
                role: "admin",
            });
            console.log("[Init] Admin user created: admin / password123 (Please change password immediately!)");

            // Create default student user
            await db.insert(users).values({
                name: "Student Demo",
                username: "siswa",
                password: studentPasswordHash,
                role: "student",
            });
            console.log("[Init] Student user created: siswa / password123");
        } else {
            console.log("[Init] Database already contains data. Skipping seed.");
        }

    } catch (error) {
        console.error("[Init] Database initialization failed:", error);
    }
}
