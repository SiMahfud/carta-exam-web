import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq } from "drizzle-orm";

// POST /api/grading/submissions/[id]/publish - Publish results to student
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Check if submission exists
        const submissionData = await db.select()
            .from(submissions)
            .where(eq(submissions.id, params.id))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];

        // Check if grading is complete
        if (submission.gradingStatus === 'pending_manual') {
            return NextResponse.json(
                { error: "Cannot publish: Manual grading is still pending for some questions" },
                { status: 400 }
            );
        }

        // Update submission to published
        await db.update(submissions)
            .set({
                gradingStatus: "published",
            })
            .where(eq(submissions.id, params.id));

        // TODO: Send notification to student (email, in-app, etc.)

        return NextResponse.json({
            success: true,
            message: "Results published successfully"
        });
    } catch (error) {
        console.error("Error publishing results:", error);
        return NextResponse.json(
            { error: "Failed to publish results" },
            { status: 500 }
        );
    }
}
