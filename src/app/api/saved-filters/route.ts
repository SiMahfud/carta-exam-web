import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { savedFilters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

// Validation schema
const createFilterSchema = z.object({
    name: z.string().min(1, "Nama filter wajib diisi").max(100),
    page: z.string().min(1),
    filters: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.boolean(), z.null()])),
    isDefault: z.boolean().optional().default(false),
});

// Helper to get user ID from session
async function getUserId(): Promise<string | null> {
    const user = await getCurrentUser();
    return user?.id || null;
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

        const filters = await (db as any)
            .select()
            .from(savedFilters)
            .where(and(
                eq(savedFilters.userId, userId),
                eq(savedFilters.page, page)
            ))
            .orderBy(savedFilters.createdAt);

        const formattedFilters = filters.map((f: any) => {
            let parsedFilters = f.filters;
            if (typeof parsedFilters === "string") {
                try {
                    parsedFilters = JSON.parse(parsedFilters);
                } catch {
                    parsedFilters = {};
                }
            }
            return {
                ...f,
                filters: parsedFilters || {},
            };
        });

        return NextResponse.json({ data: formattedFilters });
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
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name, page, filters, isDefault } = parsed.data;

        // If setting as default, unset other defaults for this page
        if (isDefault) {
            await (db as any)
                .update(savedFilters)
                .set({ isDefault: false })
                .where(and(
                    eq(savedFilters.userId, userId),
                    eq(savedFilters.page, page)
                ));
        }

        const id = crypto.randomUUID();
        await (db as any)
            .insert(savedFilters)
            .values({
                id,
                userId,
                name,
                page,
                filters,
                isDefault,
            });

        const [newFilter] = await (db as any)
            .select()
            .from(savedFilters)
            .where(eq(savedFilters.id, id));

        let formattedFilters = newFilter?.filters;
        if (typeof formattedFilters === "string") {
            try {
                formattedFilters = JSON.parse(formattedFilters);
            } catch {
                formattedFilters = {};
            }
        }

        return NextResponse.json(
            {
                data: newFilter
                    ? { ...newFilter, filters: formattedFilters || {} }
                    : null,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating saved filter:", error);
        return NextResponse.json(
            { error: "Gagal menyimpan filter" },
            { status: 500 }
        );
    }
}
