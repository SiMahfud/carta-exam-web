import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

interface Violation {
    type: string;
    details: string;
    timestamp: string;
}

// GET /api/exam-sessions/[id]/violations/[studentId] - Get violation details
export async function GET(
    request: Request,
    { params }: { params: { id: string; studentId: string } }
) {
    try {
        const submissionData = await db.select({
            violationCount: submissions.violationCount,
            violationLog: submissions.violationLog,
            status: submissions.status,
        })
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, params.id),
                eq(submissions.userId, params.studentId)
            ))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json({
                violationCount: 0,
                violations: [],
            });
        }

        const submission = submissionData[0];
        // Cast violationLog to Violation[] or default to empty array if null
        const violations = (submission.violationLog as unknown as Violation[]) || [];

        return NextResponse.json({
            violationCount: submission.violationCount || 0,
            violations: violations.map((v: Violation) => ({
                type: v.type,
                details: v.details,
                timestamp: v.timestamp,
            })),
            status: submission.status,
        });
    } catch (error) {
        console.error("Error fetching violations:", error);
        return NextResponse.json(
            { error: "Failed to fetch violations" },
            { status: 500 }
        );
    }
}
