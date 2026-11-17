import { db } from "@/lib/db";
import { administrativeTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// DELETE /api/admin/clearance/tokens/[id] - Revoke or delete a clearance token
export const DELETE = (
    req: Request,
    { params }: { params: { id: string } }
) => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);

    const tokenId = params.id;
    if (!tokenId) {
        throw new ApiError("Token ID required", 400);
    }

    const existing = await (db as any)
        .select()
        .from(administrativeTokens)
        .where(eq(administrativeTokens.id, tokenId))
        .limit(1);

    if (existing.length === 0) {
        throw new ApiError("Token not found", 404);
    }

    await (db as any)
        .delete(administrativeTokens)
        .where(eq(administrativeTokens.id, tokenId));

    return {
        success: true,
        message: "Token revoked successfully",
    };
});
