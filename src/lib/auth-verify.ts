import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface VerifyResult {
    success: boolean;
    user?: {
        id: string;
        name: string;
        username: string;
        role: "admin" | "teacher" | "student";
    };
    error?: string;
}

/**
 * Verifikasi kredensial username & password.
 * 1. Pertama cek database lokal CartaExam dengan bcrypt.
 * 2. Jika tidak cocok (misal akun SSO baru atau password diubah di PortoCarta),
 *    coba verifikasi langsung ke PortoCarta Master Hub via API.
 * 3. Jika PortoCarta memvalidasi, otomatis sinkronkan hash password lokal di CartaExam.
 */
export async function verifyUserCredentials(username: string, password: string): Promise<VerifyResult> {
    const cleanUsername = String(username).trim();
    if (!cleanUsername || !password) {
        return { success: false, error: "Username dan password wajib diisi" };
    }

    // 1. Cari user di database lokal CartaExam
    const [user] = await (db as any)
        .select()
        .from(users)
        .where(eq(users.username, cleanUsername))
        .limit(1);

    if (user && user.password) {
        // Cek kecocokan password lokal
        const isLocalValid = await bcrypt.compare(password, user.password);
        if (isLocalValid) {
            return {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                }
            };
        }
    }

    // 2. Fallback: Verifikasi ke PortoCarta Master Hub jika dikonfigurasi
    const portoCartaUrl = (process.env.PORTOCARTA_URL || "http://localhost:3777").replace(/\/+$/, "");
    const apiKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

    try {
        const verifyRes = await fetch(`${portoCartaUrl}/api/v1/integration/verify-user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
                "User-Agent": "CartaExam-AuthVerify/1.0",
            },
            body: JSON.stringify({
                identifier: cleanUsername,
                password,
            }),
            signal: AbortSignal.timeout(4000), // 4 detik timeout
            cache: "no-store",
        });

        if (verifyRes.ok) {
            const data = await verifyRes.json();
            if (data.success && data.user) {
                const newHash = await bcrypt.hash(password, 10);

                if (user) {
                    // Update password lokal agar request berikutnya langsung cepat
                    await (db as any)
                        .update(users)
                        .set({ password: newHash, name: data.user.name || user.name })
                        .where(eq(users.id, user.id));

                    return {
                        success: true,
                        user: {
                            id: user.id,
                            name: data.user.name || user.name,
                            username: user.username,
                            role: user.role,
                        }
                    };
                } else {
                    // Jika user belum pernah ada di CartaExam tapi valid di PortoCarta, buat akunnya
                    const newId = crypto.randomUUID();
                    let role = "student";
                    const rawRole = (data.user.role || "").toLowerCase();
                    if (rawRole === "admin" || rawRole === "superadmin") role = "admin";
                    else if (rawRole !== "siswa" && !data.user.is_student) role = "teacher";

                    await (db as any).insert(users).values({
                        id: newId,
                        name: data.user.name || cleanUsername,
                        username: cleanUsername,
                        password: newHash,
                        role: role as any,
                    });

                    return {
                        success: true,
                        user: {
                            id: newId,
                            name: data.user.name || cleanUsername,
                            username: cleanUsername,
                            role: role as any,
                        }
                    };
                }
            }
        }
    } catch {
        // Abaikan error koneksi PortoCarta, fallback ke pesan error login standar
    }

    return {
        success: false,
        error: "Username atau password salah",
    };
}
