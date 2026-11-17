import { db } from "@/lib/db";
import { administrativeTokens, users } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

function generateRandomToken(length = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude easily confused chars like I, O, 0, 1
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// GET /api/admin/clearance/tokens - List administrative clearance tokens
export const GET = (req: Request) => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);

    const tokens = await (db as any)
        .select({
            id: administrativeTokens.id,
            token: administrativeTokens.token,
            studentId: administrativeTokens.studentId,
            studentName: users.name,
            studentUsername: users.username,
            expiresAt: administrativeTokens.expiresAt,
            isUsed: administrativeTokens.isUsed,
            usedAt: administrativeTokens.usedAt,
            notes: administrativeTokens.notes,
            createdBy: administrativeTokens.createdBy,
            createdAt: administrativeTokens.createdAt,
        })
        .from(administrativeTokens)
        .leftJoin(users, eq(administrativeTokens.studentId, users.id))
        .orderBy(desc(administrativeTokens.createdAt))
        .limit(100);

    return tokens;
});

// POST /api/admin/clearance/tokens - Generate new clearance token
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const { studentId, customToken, notes, expiresAt } = body;

    let token = customToken ? String(customToken).trim().toUpperCase() : generateRandomToken(6);

    // Ensure token uniqueness
    let attempts = 0;
    while (attempts < 5) {
        const existing = await (db as any)
            .select({ id: administrativeTokens.id })
            .from(administrativeTokens)
            .where(eq(administrativeTokens.token, token))
            .limit(1);

        if (existing.length === 0) break;
        token = generateRandomToken(6);
        attempts++;
    }

    // Default expiration: end of current day (23:59:59)
    let expirationDate: Date;
    if (expiresAt) {
        expirationDate = new Date(expiresAt);
    } else {
        expirationDate = new Date();
        expirationDate.setHours(23, 59, 59, 999);
    }

    const id = crypto.randomUUID();
    const newToken = {
        id,
        token,
        studentId: studentId || null,
        expiresAt: expirationDate,
        isUsed: false,
        usedAt: null,
        notes: notes || null,
        createdBy: user.id,
        createdAt: new Date(),
    };

    await (db as any).insert(administrativeTokens).values(newToken);

    return {
        success: true,
        data: newToken,
    };
});
