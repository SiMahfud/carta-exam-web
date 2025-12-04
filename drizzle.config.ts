import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/lib/schema.ts",
    out: "./drizzle",
    dialect: (process.env.DATABASE_PROVIDER as "sqlite" | "mysql" | "postgresql") || "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_URL || "file:local.db",
    },
});
