import { NextResponse } from "next/server";
import { signSession, getSessionCookieOptions, DEFAULT_SESSION_MAX_AGE } from "@/lib/session";
import { verifyUserCredentials } from "@/lib/auth-verify";

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

        const verifyResult = await verifyUserCredentials(username, password);

        if (!verifyResult.success || !verifyResult.user) {
            return NextResponse.json(
                { success: false, error: verifyResult.error || "Username atau password salah." },
                { status: 401 }
            );
        }

        const user = verifyResult.user;

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
