import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: (process.env.DATABASE_PROVIDER === "mysql" || process.env.DB_TYPE === "mysql")
        ? "./src/lib/schemas/mysql.ts"
        : (process.env.DATABASE_PROVIDER === "postgres" || process.env.DB_TYPE === "postgres")
            ? "./src/lib/schemas/postgresql.ts"
            : "./src/lib/schemas/sqlite.ts",
    out: "./drizzle",
    dialect: (process.env.DATABASE_PROVIDER || process.env.DB_TYPE || "sqlite") as "sqlite" | "mysql" | "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ||
            (process.env.DB_TYPE === "mysql" ? `mysql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` :
                (process.env.DB_TYPE === "postgres" ? `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` :
                    "file:local.db")),
    },
});
