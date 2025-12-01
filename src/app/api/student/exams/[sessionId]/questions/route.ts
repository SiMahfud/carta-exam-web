import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, bankQuestions, examTemplates, examSessions } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";

// GET /api/student/exams/[sessionId]/questions - Get questions for submission
export async function GET(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get("studentId"); // TODO: Get from auth

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
                { error: "No active submission found" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];
        const questionOrder = submission.questionOrder as string[];

        // Get session to fetch template
        const sessionData = await db.select({
            templateId: examSessions.templateId,
            endTime: examSessions.endTime,
        })
            .from(examSessions)
            .where(eq(examSessions.id, params.sessionId))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const session = sessionData[0];

        // Get template for randomization settings
        const templateData = await db.select({
            randomizeAnswers: examTemplates.randomizeAnswers,
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, session.templateId))
            .limit(1);

        const template = templateData[0];

        // Fetch all questions
        const questions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.id, questionOrder));

        // Map questions in the correct order
        const orderedQuestions = questionOrder.map(id => {
            const question = questions.find(q => q.id === id);
            if (!question) return null;

            const content = question.content as any;
            const answerKey = question.answerKey as any;

            // Randomize options if enabled (for MC and Complex MC)
            let options = content.options || [];
            if (template.randomizeAnswers && (question.type === 'mc' || question.type === 'complex_mc')) {
                options = [...options].sort(() => Math.random() - 0.5);
            }

            // Transform options to expected format {label, text}
            const formattedOptions = options.map((opt: string, index: number) => ({
                label: String.fromCharCode(65 + index), // A, B, C, D, E
                text: opt
            }));

            return {
                id: question.id,
                type: question.type,
                questionText: content.question || content.questionText,
                options: formattedOptions,
                pairs: content.pairs,
                points: question.defaultPoints,
                // Don't send answer keys to student
            };
        }).filter(Boolean);

        return NextResponse.json({
            questions: orderedQuestions,
            endTime: session.endTime,
            submissionId: submission.id,
        });
    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            { error: "Failed to fetch questions" },
            { status: 500 }
        );
    }
}
