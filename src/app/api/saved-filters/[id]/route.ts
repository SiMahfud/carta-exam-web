"use server";

import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { savedFilters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

// Helper to get user ID from cookie
async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value || null;
}

// Validation schema for update
const updateFilterSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
});

// PATCH /api/saved-filters/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = updateFilterSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        // Verify ownership
        const [existing] = await db
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
                await db
                    .update(savedFilters)
                    .set({ isDefault: false })
                    .where(and(
                        eq(savedFilters.userId, userId),
                        eq(savedFilters.page, existing.page)
                    ));
            }
            updateData.isDefault = parsed.data.isDefault;
        }

        const [updated] = await db
            .update(savedFilters)
            .set(updateData)
            .where(eq(savedFilters.id, id))
            .returning();

        return NextResponse.json({ data: updated });
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Verify ownership and delete
        const [deleted] = await db
            .delete(savedFilters)
            .where(and(
                eq(savedFilters.id, id),
                eq(savedFilters.userId, userId)
            ))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: "Filter tidak ditemukan" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: deleted });
    } catch (error) {
        console.error("Error deleting saved filter:", error);
        return NextResponse.json(
            { error: "Gagal menghapus filter" },
            { status: 500 }
        );
    }
}
