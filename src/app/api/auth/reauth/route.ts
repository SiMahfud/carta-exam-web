import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSession, getSessionCookieOptions, DEFAULT_SESSION_MAX_AGE } from "@/lib/session";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Username dan password wajib diisi." },
                { status: 400 }
            );
        }

        const [user] = await (db as any)
            .select()
            .from(users)
            .where(eq(users.username, String(username).trim()))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Username atau password salah." },
                { status: 401 }
            );
        }

        const isValid = await bcrypt.compare(String(password), user.password);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Username atau password salah." },
                { status: 401 }
            );
        }

        const token = await signSession({
            id: user.id,
            role: user.role,
            name: user.name,
        }, DEFAULT_SESSION_MAX_AGE);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                username: user.username,
            },
            message: "Sesi berhasil diperbarui.",
        });

        response.cookies.set("user_session", token, getSessionCookieOptions(DEFAULT_SESSION_MAX_AGE));

        return response;
    } catch (error: any) {
        console.error("Reauth error:", error);
        return NextResponse.json(
            { success: false, error: "Gagal memperbarui sesi. Silakan coba lagi." },
            { status: 500 }
        );
    }
}
