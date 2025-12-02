import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

// GET /api/admin/health - Health check endpoint
export async function GET() {
    const startTime = Date.now();

    try {
        // Test database connection with a simple query
        await db.select({ count: sql<number>`count(*)` }).from(users).limit(1);

        const responseTime = Date.now() - startTime;

        // Determine health status based on response time
        let status: "operational" | "degraded" | "down" = "operational";
        if (responseTime > 1000) {
            status = "degraded";
        }

        // Get version from package.json
        let version = "Unknown";
        try {
            const packageJsonPath = join(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            version = packageJson.version || "2.4.0";
        } catch {
            version = "2.4.0";
        }

        return NextResponse.json({
            server: {
                status,
                responseTime: `${responseTime}ms`,
            },
            database: {
                status: "connected",
                responseTime: `${responseTime}ms`,
            },
            version: `${version} (Stable)`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Health check failed:", error);

        return NextResponse.json({
            server: {
                status: "operational",
                responseTime: "0ms",
            },
            database: {
                status: "down",
                responseTime: "N/A",
            },
            version: "2.4.0 (Stable)",
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
