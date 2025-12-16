import { db } from "./db";
import { users } from "./schema";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { migrate as migrateMysql } from "drizzle-orm/mysql2/migrator";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
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

        // 1. Run Migrations
        console.log("[Init] Running migrations...");
        if (provider === "mysql") {
            await migrateMysql(db, { migrationsFolder });
        } else if (provider === "postgres") {
            await migratePg(db, { migrationsFolder });
        } else {
            await migrateSqlite(db, { migrationsFolder });
        }
        console.log("[Init] Migrations completed successfully.");

        // 2. Check if seeding is needed
        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        const count = Number(userCount[0]?.count || 0);

        if (count === 0) {
            console.log("[Init] Database appears empty. Seeding initial data...");

            // Create default admin user
            await db.insert(users).values({
                name: "Administrator",
                username: "admin",
                password: "password123",
                role: "admin",
            });
            console.log("[Init] Admin user created: admin / password123");

            // Create default student user
            await db.insert(users).values({
                name: "Student Demo",
                username: "siswa",
                password: "password123",
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
