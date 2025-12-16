import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, submissions, bankQuestions } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";
import { applyQuestionRandomization, RandomizationRules } from "@/lib/randomization";

// POST /api/student/exams/[sessionId]/start - Start taking an exam
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const body = await request.json();
        const { studentId, token } = body; // TODO: Get studentId from auth session

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
            accessToken: examSessions.accessToken,
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

        // Token validation if required
        if (template.requireToken) {
            if (!token) {
                return NextResponse.json(
                    { error: "Token diperlukan untuk memulai ujian", requireToken: true },
                    { status: 403 }
                );
            }
            if (token !== session.accessToken) {
                return NextResponse.json(
                    { error: "Token tidak valid", requireToken: true },
                    { status: 403 }
                );
            }
        }

        // Parse composition if it's a JSON string
        let composition: Record<string, number>;
        if (typeof template.questionComposition === 'string') {
            try {
                composition = JSON.parse(template.questionComposition);
            } catch {
                composition = {};
            }
        } else {
            composition = (template.questionComposition as Record<string, number>) || {};
        }

        // Parse bankIds if it's a JSON string
        let bankIds: string[];
        if (typeof template.bankIds === 'string') {
            try {
                bankIds = JSON.parse(template.bankIds);
            } catch {
                bankIds = [];
            }
        } else {
            bankIds = (template.bankIds as string[]) || [];
        }

        if (bankIds.length === 0) {
            return NextResponse.json({ error: "No question banks configured" }, { status: 400 });
        }

        // Fetch questions from banks based on composition
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Select questions by type according to composition
        const selectedQuestions: any[] = [];
        const questionTypes = ['mc', 'complex_mc', 'matching', 'short', 'essay', 'true_false'];

        for (const type of questionTypes) {
            const count = composition[type] || 0;
            if (count > 0) {
                let typeQuestions = allQuestions.filter((q: typeof allQuestions[0]) => q.type === type);

                // Sort by questionNumber to ensure deterministic starting point
                typeQuestions.sort((a: any, b: any) => ((a.questionNumber || 0) - (b.questionNumber || 0)));

                if (template.randomizeQuestions) {
                    // If random enabled, shuffle the pool before slicing
                    typeQuestions = typeQuestions.sort(() => Math.random() - 0.5);
                }

                selectedQuestions.push(...typeQuestions.slice(0, count));
            }
        }

        // Apply randomization based on template rules
        let questionOrder: string[];

        if (template.randomizeQuestions) {
            const randomizationRules = (template.randomizationRules as RandomizationRules) || { mode: 'all' };
            questionOrder = applyQuestionRandomization(selectedQuestions, randomizationRules);
        } else {
            // Strict sorting by questionNumber if randomization is disabled
            // This ensures mixed types appear in the correct Question Number order (e.g. 1, 2, 3...)
            questionOrder = selectedQuestions
                .sort((a, b) => ((a.questionNumber || 0) - (b.questionNumber || 0)))
                .map(q => q.id);
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
