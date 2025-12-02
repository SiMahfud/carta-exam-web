import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, inArray, sql } from "drizzle-orm";

// POST /api/grading/batch-publish - Batch publish multiple submissions
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { submissionIds } = body;

        if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
            return NextResponse.json(
                { error: "submissionIds must be a non-empty array" },
                { status: 400 }
            );
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { submissionId: string; error: string }[],
        };

        // Process each submission
        for (const submissionId of submissionIds) {
            try {
                // Check if submission is ready to be published (must be completed)
                const submission = await db.select()
                    .from(submissions)
                    .where(eq(submissions.id, submissionId))
                    .limit(1);

                if (!submission || submission.length === 0) {
                    results.failed++;
                    results.errors.push({
                        submissionId,
                        error: "Submission not found",
                    });
                    continue;
                }

                const sub = submission[0];

                // Check if grading is completed
                if (sub.gradingStatus === "pending_manual") {
                    results.failed++;
                    results.errors.push({
                        submissionId,
                        error: "Submission has pending manual grading",
                    });
                    continue;
                }

                // Update status to published
                await db.update(submissions)
                    .set({ gradingStatus: "published" })
                    .where(eq(submissions.id, submissionId));

                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({
                    submissionId,
                    error: error.message || "Unknown error",
                });
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Error in batch publish:", error);
        return NextResponse.json(
            { error: "Failed to batch publish submissions" },
            { status: 500 }
        );
    }
}
