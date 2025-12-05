import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Generate random 6-character alphanumeric token
function generateToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like O, 0, I, 1
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// GET /api/exam-sessions/[id]/token - Get current token
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const sessionData = await db.select({
            accessToken: examSessions.accessToken,
            templateId: examSessions.templateId,
        })
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // Get template to check if token is required
        const templateData = await db.select({
            requireToken: examTemplates.requireToken,
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, sessionData[0].templateId))
            .limit(1);

        return NextResponse.json({
            accessToken: sessionData[0].accessToken,
            requireToken: templateData[0]?.requireToken ?? false,
        });
    } catch (error) {
        console.error("Error fetching token:", error);
        return NextResponse.json(
            { error: "Failed to fetch token" },
            { status: 500 }
        );
    }
}

// POST /api/exam-sessions/[id]/token - Generate new token
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const newToken = generateToken();

        await db.update(examSessions)
            .set({ accessToken: newToken })
            .where(eq(examSessions.id, params.id));

        return NextResponse.json({
            accessToken: newToken,
            message: "Token generated successfully"
        });
    } catch (error) {
        console.error("Error generating token:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}

// DELETE /api/exam-sessions/[id]/token - Clear token
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await db.update(examSessions)
            .set({ accessToken: null })
            .where(eq(examSessions.id, params.id));

        return NextResponse.json({
            message: "Token cleared successfully"
        });
    } catch (error) {
        console.error("Error clearing token:", error);
        return NextResponse.json(
            { error: "Failed to clear token" },
            { status: 500 }
        );
    }
}
