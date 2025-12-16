import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: (process.env.DATABASE_PROVIDER === "mysql")
        ? "./src/lib/schemas/mysql.ts"
        : (process.env.DATABASE_PROVIDER === "postgres")
            ? "./src/lib/schemas/postgresql.ts"
            : "./src/lib/schemas/sqlite.ts",
    out: "./drizzle",
    dialect: (process.env.DATABASE_PROVIDER as "sqlite" | "mysql" | "postgresql") || "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_URL || "file:local.db",
    },
});
