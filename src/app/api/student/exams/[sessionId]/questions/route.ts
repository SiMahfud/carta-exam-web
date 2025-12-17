import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, bankQuestions, examTemplates, examSessions, answers } from "@/lib/schema";
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

        let submission = submissionData[0];

        if (submission.status === "terminated") {
            return NextResponse.json(
                {
                    error: "Ujian dihentikan karena pelanggaran",
                    terminated: true,
                    violationCount: submission.violationCount || 0,
                    message: "Ujian Anda telah dihentikan karena melebihi batas pelanggaran. Hubungi pengawas untuk melanjutkan."
                },
                { status: 403 }
            );
        }

        // Check if submission is completed or graded
        if (submission.status === "completed" || submission.status === "graded") {
            return NextResponse.json(
                {
                    error: "Ujian telah selesai",
                    completed: true,
                    score: submission.score,
                    message: "Anda telah menyelesaikan ujian ini."
                },
                { status: 403 }
            );
        }

        // Parse questionOrder if it's a JSON string
        // Handle potential double-escaped strings
        let questionOrder: string[] = [];
        try {
            let parsed = submission.questionOrder;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (Array.isArray(parsed)) questionOrder = parsed;
        } catch { questionOrder = []; }

        if (questionOrder.length === 0) {
            console.error("No questions found in questionOrder", submission.questionOrder);
        }

        // If startTime is null (after reset), set it to current time
        if (!submission.startTime) {
            const now = new Date();
            await db.update(submissions)
                .set({ startTime: now })
                .where(eq(submissions.id, submission.id));
            submission = { ...submission, startTime: now };
        }

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
            randomizationRules: examTemplates.randomizationRules,
            durationMinutes: examTemplates.durationMinutes,
            minDurationMinutes: examTemplates.minDurationMinutes,
            maxViolations: examTemplates.maxViolations,
            violationSettings: examTemplates.violationSettings,
            enableLockdown: examTemplates.enableLockdown,
            randomizeAnswers: examTemplates.randomizeAnswers,
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, session.templateId))
            .limit(1);

        const template = templateData[0];

        let randomizationRules: { shuffleAnswers?: boolean } = {};
        try {
            let parsed = template.randomizationRules;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (parsed && typeof parsed === 'object') randomizationRules = parsed as { shuffleAnswers?: boolean };
        } catch { randomizationRules = {}; }

        const shuffleAnswers = template.randomizeAnswers || randomizationRules.shuffleAnswers || false;

        // Fetch all questions
        const questions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.id, questionOrder));

        // Map questions in the correct order
        const orderedQuestions = questionOrder.map(id => {
            const question = questions.find((q: typeof questions[0]) => q.id === id);
            if (!question) return null;

            // Parse content if it's a JSON string
            let content: any;
            if (typeof question.content === 'string') {
                try {
                    content = JSON.parse(question.content);
                } catch {
                    content = {};
                }
            } else {
                content = question.content || {};
            }

            // Randomize options if enabled (for MC and Complex MC)
            let options = content.options || [];
            if (shuffleAnswers && (question.type === 'mc' || question.type === 'complex_mc' || question.type === 'true_false')) {
                options = [...options].sort(() => Math.random() - 0.5);
            }

            // Transform options to expected format {label, text}
            const formattedOptions = options.map((opt: string, index: number) => ({
                label: String.fromCharCode(65 + index), // A, B, C, D, E
                text: opt
            }));

            // Handle matching question items
            let rightItems = content.rightItems || [];
            if (shuffleAnswers && question.type === 'matching') {
                rightItems = [...rightItems].sort(() => Math.random() - 0.5);
            }

            return {
                id: question.id,
                type: question.type,
                questionText: content.question || content.questionText,
                options: formattedOptions,
                leftItems: content.leftItems,
                rightItems: rightItems,
                points: question.defaultPoints,
                // Don't send answer keys to student
            };
        }).filter(Boolean);

        // Fetch existing answers
        const existingAnswers = await db.select()
            .from(answers)
            .where(eq(answers.submissionId, submission.id));

        // Map answers for frontend
        const answersMap: Record<string, any> = {};
        existingAnswers.forEach((ans: typeof existingAnswers[0]) => {
            // Use bankQuestionId if available, otherwise fallback to questionId (legacy)
            const qId = ans.bankQuestionId || ans.questionId;
            if (qId) {
                answersMap[qId] = {
                    answer: ans.studentAnswer,
                    isFlagged: ans.isFlagged
                };
            }
        });

        // Calculate effective end time
        // End time is the earlier of:
        // 1. Student's start time + duration + bonus time
        // 2. Session's hard end time
        let effectiveEndTime = new Date(session.endTime);
        const bonusMinutes = submission.bonusTimeMinutes || 0;

        if (submission.startTime && template.durationMinutes) {
            const startTime = new Date(submission.startTime);
            const durationMs = (template.durationMinutes + bonusMinutes) * 60 * 1000;
            const studentEndTime = new Date(startTime.getTime() + durationMs);

            if (studentEndTime < effectiveEndTime) {
                effectiveEndTime = studentEndTime;
            }
        }

        return NextResponse.json({
            questions: orderedQuestions,
            endTime: effectiveEndTime,
            startTime: submission.startTime,
            minDurationMinutes: template.minDurationMinutes || 0,
            submissionId: submission.id,
            answers: answersMap,
            violationCount: submission.violationCount || 0,
            // Security settings
            maxViolations: template.maxViolations || 3,
            violationSettings: template.violationSettings,
            enableLockdown: template.enableLockdown,
        });
    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            { error: "Failed to fetch questions" },
            { status: 500 }
        );
    }
}
