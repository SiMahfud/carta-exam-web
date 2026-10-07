import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { savedFilters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

// Helper to get user ID from session
async function getUserId(): Promise<string | null> {
    const user = await getCurrentUser();
    return user?.id || null;
}

// Validation schema for update
const updateFilterSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
});

// PATCH /api/saved-filters/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const resolvedParams = await Promise.resolve(params);
        const { id } = resolvedParams;
        const body = await request.json();
        const parsed = updateFilterSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        // Verify ownership
        const [existing] = await (db as any)
            .select()
            .from(savedFilters)
            .where(and(
                eq(savedFilters.id, id),
                eq(savedFilters.userId, userId)
            ));

        if (!existing) {
            return NextResponse.json(
                { error: "Filter tidak ditemukan" },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (parsed.data.name !== undefined) {
            updateData.name = parsed.data.name;
        }
        if (parsed.data.isDefault !== undefined) {
            // If setting as default, unset other defaults for this page
            if (parsed.data.isDefault) {
                await (db as any)
                    .update(savedFilters)
                    .set({ isDefault: false })
                    .where(and(
                        eq(savedFilters.userId, userId),
                        eq(savedFilters.page, existing.page)
                    ));
            }
            updateData.isDefault = parsed.data.isDefault;
        }

        await (db as any)
            .update(savedFilters)
            .set(updateData)
            .where(eq(savedFilters.id, id));

        const [updated] = await (db as any)
            .select()
            .from(savedFilters)
            .where(eq(savedFilters.id, id));

        let formattedFilters = updated?.filters;
        if (typeof formattedFilters === "string") {
            try {
                formattedFilters = JSON.parse(formattedFilters);
            } catch {
                formattedFilters = {};
            }
        }

        return NextResponse.json({
            data: updated ? { ...updated, filters: formattedFilters || {} } : null,
        });
    } catch (error) {
        console.error("Error updating saved filter:", error);
        return NextResponse.json(
            { error: "Gagal memperbarui filter" },
            { status: 500 }
        );
    }
}

// DELETE /api/saved-filters/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const resolvedParams = await Promise.resolve(params);
        const { id } = resolvedParams;

        // Verify ownership and delete
        const [existing] = await (db as any)
            .select()
            .from(savedFilters)
            .where(and(
                eq(savedFilters.id, id),
                eq(savedFilters.userId, userId)
            ));

        if (!existing) {
            return NextResponse.json(
                { error: "Filter tidak ditemukan" },
                { status: 404 }
            );
        }

        await (db as any)
            .delete(savedFilters)
            .where(and(
                eq(savedFilters.id, id),
                eq(savedFilters.userId, userId)
            ));

        return NextResponse.json({ data: existing });
    } catch (error) {
        console.error("Error deleting saved filter:", error);
        return NextResponse.json(
            { error: "Gagal menghapus filter" },
            { status: 500 }
        );
    }
}
