import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";

// GET /api/subjects/[id] - Get single subject
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
    } catch (error) {
        console.error("Error fetching subject:", error);
        return NextResponse.json(
            { error: "Failed to fetch subject" },
            { status: 500 }
        );
    }
}

// PUT /api/subjects/[id] - Update subject
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
        const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
        if (admin.length > 0) {
            await ActivityLogger.subject.updated(admin[0].id, updated[0].id, updated[0].name);
        }

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
            { error: "Failed to update subject" },
            { status: 500 }
        );
    }
}

// DELETE /api/subjects/[id] - Delete subject
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const deleted = await db.select().from(subjects).where(eq(subjects.id, params.id)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        await db.delete(subjects).where(eq(subjects.id, params.id));

        // Log activity
        const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
        if (admin.length > 0) {
            await ActivityLogger.subject.deleted(admin[0].id, deleted[0].id, deleted[0].name);
        }

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Error deleting subject:", error);
        return NextResponse.json(
            { error: "Failed to delete subject" },
            { status: 500 }
        );
    }
}
