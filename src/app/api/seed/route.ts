import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Create Admin
        await db.insert(users).values({
            name: "Administrator",
            username: "admin",
            password: "password123",
            role: "admin",
        }).onConflictDoNothing();

        // Create Student
        await db.insert(users).values({
            name: "Siswa Teladan",
            username: "siswa",
            password: "siswa123",
            role: "student",
        }).onConflictDoNothing();

        return NextResponse.json({ success: true, message: "Users created" });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
