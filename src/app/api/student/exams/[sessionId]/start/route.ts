import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, submissions, bankQuestions } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";

// POST /api/student/exams/[sessionId]/start - Start taking an exam
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const body = await request.json();
        const { studentId } = body; // TODO: Get from auth session

        if (!studentId) {
            return NextResponse.json(
                { error: "Student ID required" },
                { status: 400 }
            );
        }

        // Check if already has submission
        const existingSubmission = await db.select()
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, params.sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (existingSubmission.length > 0) {
            return NextResponse.json(
                { error: "Exam already started" },
                { status: 400 }
            );
        }

        // Get session and template details
        const sessionData = await db.select({
            templateId: examSessions.templateId,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            status: examSessions.status,
        })
            .from(examSessions)
            .where(eq(examSessions.id, params.sessionId))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        const session = sessionData[0];

        // Check if session is active
        const now = new Date();
        if (now < new Date(session.startTime) || now > new Date(session.endTime)) {
            return NextResponse.json(
                { error: "Exam is not currently active" },
                { status: 400 }
            );
        }

        // Get template configuration
        const templateData = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, session.templateId))
            .limit(1);

        if (templateData.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        const template = templateData[0];
        const composition = template.questionComposition as any;
        const bankIds = template.bankIds as string[];

        // Fetch questions from banks based on composition
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Select questions by type according to composition
        const selectedQuestions: any[] = [];
        const questionTypes = ['mc', 'complex_mc', 'matching', 'short', 'essay'];

        for (const type of questionTypes) {
            const count = composition[type] || 0;
            if (count > 0) {
                const typeQuestions = allQuestions.filter(q => q.type === type);
                // Shuffle and take required count
                const shuffled = typeQuestions.sort(() => Math.random() - 0.5);
                selectedQuestions.push(...shuffled.slice(0, count));
            }
        }

        // Apply randomization if enabled
        let questionOrder = selectedQuestions.map(q => q.id);
        if (template.randomizeQuestions) {
            questionOrder = questionOrder.sort(() => Math.random() - 0.5);
        }

        // Create submission
        // Create submission
        const submissionId = crypto.randomUUID();
        await db.insert(submissions).values({
            id: submissionId,
            userId: studentId,
            sessionId: params.sessionId,
            status: "in_progress",
            questionOrder,
            flaggedQuestions: [],
            violationCount: 0,
            violationLog: [],
            gradingStatus: "auto",
        });

        return NextResponse.json({
            submissionId: submissionId,
            questionOrder,
            message: "Exam started successfully"
        }, { status: 201 });
    } catch (error) {
        console.error("Error starting exam:", error);
        return NextResponse.json(
            { error: "Failed to start exam" },
            { status: 500 }
        );
    }
}
