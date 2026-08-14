import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/subjects/[id] - Get single subject
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
        const subject = await db.select()
            .from(subjects)
            .where(eq(subjects.id, params.id))
            .limit(1);

        if (subject.length === 0) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(subject[0]);
    } catch (error: any) {
        console.error("Error fetching subject:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch subject" },
            { status: error.status || 500 }
        );
    }
}

// PUT /api/subjects/[id] - Update subject
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const body = await request.json();
        const { name, code, description } = body;

        await db.update(subjects)
            .set({
                name,
                code: code?.toUpperCase(),
                description,
            })
            .where(eq(subjects.id, params.id));

        const updated = await db.select().from(subjects).where(eq(subjects.id, params.id)).limit(1);

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        // Log activity
        await ActivityLogger.subject.updated(user.id, updated[0].id, updated[0].name);

        return NextResponse.json(updated[0]);
    } catch (error: unknown) {
        console.error("Error updating subject:", error);
        if (error instanceof Error && error.message.includes("UNIQUE")) {
            return NextResponse.json(
                { error: "Subject code already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: (error as any)?.message || "Failed to update subject" },
            { status: (error as any)?.status || 500 }
        );
    }
}

// DELETE /api/subjects/[id] - Delete subject
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const deleted = await db.select().from(subjects).where(eq(subjects.id, params.id)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        await db.delete(subjects).where(eq(subjects.id, params.id));

        // Log activity
        await ActivityLogger.subject.deleted(user.id, deleted[0].id, deleted[0].name);

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting subject:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete subject" },
            { status: error.status || 500 }
        );
    }
}
