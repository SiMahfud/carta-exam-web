import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
    try {
        // Enforce admin authentication
        await requireAuth(["admin"]);

        const adminPassword = await bcrypt.hash("password123", 10);
        const studentPassword = await bcrypt.hash("siswa123", 10);

        // Create Admin
        await db.insert(users).values({
            name: "Administrator",
            username: "admin",
            password: adminPassword,
            role: "admin",
        }).onConflictDoNothing();

        // Create Student
        await db.insert(users).values({
            name: "Siswa Teladan",
            username: "siswa",
            password: studentPassword,
            role: "student",
        }).onConflictDoNothing();

        return NextResponse.json({ success: true, message: "Users seeded securely" });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message || String(e) },
            { status: e.status || 500 }
        );
    }
}
