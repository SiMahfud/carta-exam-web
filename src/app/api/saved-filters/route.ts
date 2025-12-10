"use server";

import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { savedFilters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

// Validation schema
const createFilterSchema = z.object({
    name: z.string().min(1, "Nama filter wajib diisi").max(100),
    page: z.string().min(1),
    filters: z.record(z.union([z.string(), z.array(z.string()), z.boolean(), z.null()])),
    isDefault: z.boolean().optional().default(false),
});

// Helper to get user ID from cookie
async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value || null;
}

// GET /api/saved-filters?page=grading
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = searchParams.get("page");

        if (!page) {
            return NextResponse.json(
                { error: "Parameter 'page' wajib diisi" },
                { status: 400 }
            );
        }

        const filters = await db
            .select()
            .from(savedFilters)
            .where(and(
                eq(savedFilters.userId, userId),
                eq(savedFilters.page, page)
            ))
            .orderBy(savedFilters.createdAt);

        return NextResponse.json({ data: filters });
    } catch (error) {
        console.error("Error fetching saved filters:", error);
        return NextResponse.json(
            { error: "Gagal memuat filter tersimpan" },
            { status: 500 }
        );
    }
}

// POST /api/saved-filters
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const parsed = createFilterSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { name, page, filters, isDefault } = parsed.data;

        // If setting as default, unset other defaults for this page
        if (isDefault) {
            await db
                .update(savedFilters)
                .set({ isDefault: false })
                .where(and(
                    eq(savedFilters.userId, userId),
                    eq(savedFilters.page, page)
                ));
        }

        const [newFilter] = await db
            .insert(savedFilters)
            .values({
                userId,
                name,
                page,
                filters,
                isDefault,
            })
            .returning();

        return NextResponse.json({ data: newFilter }, { status: 201 });
    } catch (error) {
        console.error("Error creating saved filter:", error);
        return NextResponse.json(
            { error: "Gagal menyimpan filter" },
            { status: 500 }
        );
    }
}
