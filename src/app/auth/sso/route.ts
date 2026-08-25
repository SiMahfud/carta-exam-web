import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, classes, classStudents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signSession, getSessionCookieOptions, DEFAULT_SESSION_MAX_AGE, UserRole } from "@/lib/session";

function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf-8");
}

function verifySsoToken(token: string, secretKey: string) {
    if (!token || typeof token !== "string") {
        throw new Error("Token SSO tidak valid");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new Error("Format token JWT tidak sesuai");
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    if (signature !== expectedSignature) {
        throw new Error("Tanda tangan token SSO tidak valid");
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
        throw new Error("Token SSO telah kedaluwarsa. Silakan klik ulang dari PortoCarta.");
    }

    return payload;
}

function resolveRedirectUrl(request: NextRequest, redirectPath: string): URL {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");

    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
        return new URL(redirectPath, `${proto}://${host}`);
    }

    if (process.env.APP_URL) {
        const base = process.env.APP_URL.replace(/\/+$/, "");
        return new URL(redirectPath, base);
    }

    return new URL(redirectPath, request.url);
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.redirect(resolveRedirectUrl(request, "/login?error=token_missing"));
    }

    try {
        const secretKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";
        const ssoData = verifySsoToken(token, secretKey);
        const ssoUser = ssoData.user;

        if (!ssoUser || !ssoUser.identifier || !ssoUser.nama) {
            return NextResponse.redirect(resolveRedirectUrl(request, "/login?error=invalid_payload"));
        }

        const username = String(ssoUser.identifier).trim();
        const rawRole = (ssoUser.role || "").toLowerCase();

        // Map role PortoCarta -> CartaExam ("admin" | "teacher" | "student")
        let role: UserRole = "student";
        if (rawRole === "admin" || rawRole === "superadmin" || username.toLowerCase() === "admin") {
            role = "admin";
        } else if (rawRole === "siswa" || ssoUser.is_student) {
            role = "student";
        } else {
            role = "teacher";
        }

        // Cari atau buat user di database CartaExam
        let [existingUser] = await (db as any)
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (!existingUser) {
            // Gunakan password acak yang kuat agar tidak dapat ditebak dari NIS/Username
            const randomSecretPassword = crypto.randomBytes(32).toString("hex");
            const defaultHashedPassword = await bcrypt.hash(randomSecretPassword, 10);
            const newUserId = crypto.randomUUID();

            await (db as any).insert(users).values({
                id: newUserId,
                name: ssoUser.nama,
                username: username,
                password: defaultHashedPassword,
                role: role
            });

            existingUser = {
                id: newUserId,
                name: ssoUser.nama,
                username: username,
                role: role
            };
        } else {
            // Pastikan role dan nama selalu diselaraskan dengan hak akses terbaru
            if (existingUser.name !== ssoUser.nama || existingUser.role !== role) {
                await (db as any)
                    .update(users)
                    .set({ name: ssoUser.nama, role: role })
                    .where(eq(users.id, existingUser.id));
                existingUser.name = ssoUser.nama;
                existingUser.role = role;
            }
        }

        // Auto-enrollment kelas instan jika siswa memiliki informasi kelas pada SSO payload
        if (role === "student" && ssoUser.classroom) {
            try {
                const className = String(ssoUser.classroom).trim();
                const academicYear = ssoUser.academic_year?.trim() || "2026/2027";

                let [targetClass] = await (db as any)
                    .select()
                    .from(classes)
                    .where(and(eq(classes.name, className), eq(classes.academicYear, academicYear)))
                    .limit(1);

                if (!targetClass) {
                    // Coba cari hanya berdasarkan nama jika tahun ajaran berbeda
                    const [fallbackClass] = await (db as any)
                        .select()
                        .from(classes)
                        .where(eq(classes.name, className))
                        .limit(1);

                    if (fallbackClass) {
                        targetClass = fallbackClass;
                    } else {
                        // Buat kelas baru jika belum ada
                        let gradeNum = 10;
                        if (className.startsWith("XI-") || className.startsWith("XI ")) gradeNum = 11;
                        else if (className.startsWith("XII-") || className.startsWith("XII ")) gradeNum = 12;

                        const newClassId = crypto.randomUUID();
                        await (db as any).insert(classes).values({
                            id: newClassId,
                            name: className,
                            grade: gradeNum,
                            academicYear: academicYear,
                            teacherId: null
                        });
                        targetClass = { id: newClassId, name: className };
                    }
                }

                if (targetClass?.id) {
                    const [existingEnrollment] = await (db as any)
                        .select()
                        .from(classStudents)
                        .where(and(eq(classStudents.classId, targetClass.id), eq(classStudents.studentId, existingUser.id)))
                        .limit(1);

                    if (!existingEnrollment) {
                        await (db as any).insert(classStudents).values({
                            id: crypto.randomUUID(),
                            classId: targetClass.id,
                            studentId: existingUser.id
                        });
                    }
                }
            } catch (enrollErr) {
                console.error("SSO Class Auto-Enroll Error (non-blocking):", enrollErr);
            }
        }

        // Generate sesi login CartaExam dengan role yang telah diselaraskan
        const sessionToken = await signSession({
            id: existingUser.id,
            role: role,
            name: existingUser.name
        }, DEFAULT_SESSION_MAX_AGE);

        const mode = searchParams.get("mode");
        const redirectParam = searchParams.get("redirect");

        if (mode === "popup") {
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SSO Berhasil</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; text-align: center; }
        .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 320px; }
        .success { color: #16a34a; font-weight: 600; font-size: 16px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="success">✓ Sesi Berhasil Diperbarui</div>
        <p style="font-size: 13px; color: #64748b; margin: 0;">Menutup jendela dan melanjutkan ujian...</p>
    </div>
    <script>
        try {
            if (window.opener) {
                window.opener.postMessage({ type: "SSO_REAUTH_SUCCESS", user: ${JSON.stringify({ id: existingUser.id, name: existingUser.name, role: existingUser.role })} }, "*");
                setTimeout(() => window.close(), 600);
            }
        } catch (e) {
            console.error(e);
        }
    </script>
</body>
</html>`;
            const popupResponse = new NextResponse(html, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
            popupResponse.cookies.set("user_session", sessionToken, getSessionCookieOptions(DEFAULT_SESSION_MAX_AGE));
            return popupResponse;
        }

        // Tentukan redirect URL sesuai peran
        let redirectPath = redirectParam || (role === "admin" || role === "teacher" ? "/admin" : "/student/exams");

        const targetUrl = resolveRedirectUrl(request, redirectPath);
        const response = NextResponse.redirect(targetUrl);

        // Pasang session cookie
        response.cookies.set("user_session", sessionToken, getSessionCookieOptions(DEFAULT_SESSION_MAX_AGE));

        return response;
    } catch (err: any) {
        console.error("SSO Login Error in CartaExam:", err);
        const errMsg = encodeURIComponent(err.message || "SSO Error");
        return NextResponse.redirect(resolveRedirectUrl(request, `/login?error=sso_failed&message=${errMsg}`));
    }
}
