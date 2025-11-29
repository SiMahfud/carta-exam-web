import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers } from "@/lib/schema";
import { eq, and, sum } from "drizzle-orm";

// POST /api/student/exams/[sessionId]/submit - Submit exam
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const body = await request.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json(
                { error: "Student ID required" },
                { status: 400 }
            );
        }

        // Get submission
        const submissionData = await db.select()
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, params.sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json(
                { error: "No active submission" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];

        // Calculate total score
        const answerData = await db.select()
            .from(answers)
            .where(eq(answers.submissionId, submission.id));

        const totalEarned = answerData.reduce((sum, a) => sum + (a.partialPoints || 0), 0);
        const totalMax = answerData.reduce((sum, a) => sum + (a.maxPoints || 0), 0);

        // Check if there are essays pending manual grading
        const hasEssays = answerData.some(a => a.gradingStatus === 'pending_manual');
        const gradingStatus = hasEssays ? 'pending_manual' : 'completed';

        // Update submission
        await db.update(submissions)
            .set({
                status: "completed",
                endTime: new Date(),
                earnedPoints: totalEarned,
                totalPoints: totalMax,
                score: totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0,
                gradingStatus: gradingStatus as any,
            })
            .where(eq(submissions.id, submission.id));

        return NextResponse.json({
            success: true,
            message: "Exam submitted successfully",
            score: totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0,
            requiresManualGrading: hasEssays
        });
    } catch (error) {
        console.error("Error submitting exam:", error);
        return NextResponse.json(
            { error: "Failed to submit exam" },
            { status: 500 }
        );
    }
}
