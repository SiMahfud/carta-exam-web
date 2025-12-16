import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    examSessions,
    examTemplates,
    bankQuestions,
    questionPools,
    classStudents,
    users
} from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";
import { applyQuestionRandomization, RandomizationRules } from "@/lib/randomization";

// POST /api/exam-sessions/[id]/generate-questions - Generate questions for students
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Get session and template
        const session = await db.select()
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (session.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        const s = session[0];

        const template = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, s.templateId))
            .limit(1);

        if (template.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        const t = template[0];

        // Get list of students
        let studentIds: string[] = [];

        // Parse targetIds if it's a JSON string
        // Handle potential double-escaped strings
        let targetIds: string[] = [];
        try {
            let parsed = s.targetIds;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (Array.isArray(parsed)) targetIds = parsed;
        } catch { targetIds = []; }

        if (s.targetType === "class") {
            // Get students from classes
            if (targetIds.length > 0) {
                const students = await db.select({ studentId: classStudents.studentId })
                    .from(classStudents)
                    .where(inArray(classStudents.classId, targetIds));

                studentIds = Array.from(new Set(students.map((s: typeof students[0]) => s.studentId))); // Remove duplicates
            }
        } else {
            // Individual students
            studentIds = targetIds;
        }

        // Parse bankIds if it's a JSON string
        let bankIds: string[] = [];
        try {
            let parsed = t.bankIds;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (Array.isArray(parsed)) bankIds = parsed;
        } catch { bankIds = []; }

        if (bankIds.length === 0) {
            return NextResponse.json({ error: "No question banks configured" }, { status: 400 });
        }

        let allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Parse filterTags if it's a JSON string
        let filterTags: string[] = [];
        try {
            let parsed = t.filterTags;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (Array.isArray(parsed)) filterTags = parsed;
        } catch { filterTags = []; }

        // Apply tag filters
        if (filterTags.length > 0) {
            allQuestions = allQuestions.filter((q: typeof allQuestions[0]) => {
                const qTags = (q.tags as string[]) || [];
                return filterTags.some((tag: string) => qTags.includes(tag));
            });
        }

        // Group by type
        const questionsByType: Record<string, any[]> = {
            mc: [],
            complex_mc: [],
            matching: [],
            short: [],
            essay: [],
            true_false: [],
        };

        allQuestions.forEach((q: typeof allQuestions[0]) => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        // Parse composition if it's a JSON string
        let composition: Record<string, number> = {};
        try {
            let parsed = t.questionComposition;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (parsed && typeof parsed === 'object') composition = parsed as Record<string, number>;
        } catch { composition = {}; }
        // Parse randomization rules
        let randomizationRules: RandomizationRules = { mode: 'all' };
        try {
            let parsed = t.randomizationRules;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (parsed && typeof parsed === 'object') randomizationRules = parsed as RandomizationRules;
        } catch { randomizationRules = { mode: 'all' }; }

        const generatedQuestions: Record<string, string[]> = {};

        // Generate questions for each student
        for (const studentId of studentIds) {
            const selectedQuestions: string[] = [];

            // For each question type, select random questions
            for (const type of Object.keys(composition)) {
                const count = composition[type] || 0;
                const available = questionsByType[type as keyof typeof questionsByType] || [];

                if (count > available.length) {
                    return NextResponse.json(
                        { error: `Not enough ${type} questions available` },
                        { status: 400 }
                    );
                }

                // Random selection
                const shuffled = [...available].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, count);
                selectedQuestions.push(...selected.map((q: typeof shuffled[0]) => q.id));
            }

            // Prepare question objects for randomization (need id and type)
            const selectedQuestionObjects = selectedQuestions.map(id => {
                const q = allQuestions.find((aq: typeof allQuestions[0]) => aq.id === id);
                return { id, type: q?.type || 'unknown' };
            });

            // Randomize order based on rules
            let orderedQuestions: string[] = [];

            // Determine if we should randomize
            // If randomizeQuestions is true, OR if we have specific advanced rules configured (ignoring the default 'all' which could mean uninitialized)
            // This handles cases where user set "Exclude Type" but the boolean flag didn't get updated in DB
            const shouldRandomize = t.randomizeQuestions || (randomizationRules.mode && randomizationRules.mode !== 'all');

            if (shouldRandomize) {
                if (t.essayAtEnd) {
                    // Split essays and non-essays
                    const essays = selectedQuestionObjects.filter(q => q.type === 'essay');
                    const nonEssays = selectedQuestionObjects.filter(q => q.type !== 'essay');

                    // Apply randomization rules to non-essays only
                    const randomizedNonEssayIds = applyQuestionRandomization(nonEssays, randomizationRules);

                    // Combine: Randomized non-essays + Original essays (at end)
                    orderedQuestions = [...randomizedNonEssayIds, ...essays.map(q => q.id)];
                } else {
                    // Apply randomization to all questions
                    orderedQuestions = applyQuestionRandomization(selectedQuestionObjects, randomizationRules);
                }
            } else {
                // No randomization, but check essayAtEnd
                if (t.essayAtEnd) {
                    const essays = selectedQuestionObjects.filter(q => q.type === 'essay');
                    const nonEssays = selectedQuestionObjects.filter(q => q.type !== 'essay');
                    orderedQuestions = [...nonEssays.map(q => q.id), ...essays.map(q => q.id)];
                } else {
                    orderedQuestions = selectedQuestions;
                }
            }

            generatedQuestions[studentId] = selectedQuestions;

            // Create question pool record
            await db.insert(questionPools).values({
                sessionId: params.id,
                studentId,
                selectedQuestions,
                questionOrder: orderedQuestions,
            });
        }

        // Update session with generated questions
        await db.update(examSessions)
            .set({ generatedQuestions })
            .where(eq(examSessions.id, params.id));

        return NextResponse.json({
            message: "Questions generated successfully",
            studentCount: studentIds.length,
            questionsPerStudent: (Object.values(composition) as number[]).reduce((a, b) => a + b, 0),
        });
    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json(
            { error: "Failed to generate questions" },
            { status: 500 }
        );
    }
}
