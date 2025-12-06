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

        if (s.targetType === "class") {
            // Get students from classes
            const classIds = s.targetIds as string[];
            const students = await db.select({ studentId: classStudents.studentId })
                .from(classStudents)
                .where(inArray(classStudents.classId, classIds));

            studentIds = Array.from(new Set(students.map((s: typeof students[0]) => s.studentId))); // Remove duplicates
        } else {
            // Individual students
            studentIds = s.targetIds as string[];
        }

        // Get all questions from banks
        const bankIds = t.bankIds as string[];
        let allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Apply tag filters
        const filterTags = t.filterTags as string[] || [];
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
        };

        allQuestions.forEach((q: typeof allQuestions[0]) => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        const composition = t.questionComposition as any;
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

            // Randomize order if configured
            let orderedQuestions = selectedQuestions;
            if (t.randomizeQuestions) {
                // If essayAtEnd, separate essays and randomize the rest
                if (t.essayAtEnd) {
                    const essays = allQuestions
                        .filter((q: typeof allQuestions[0]) => selectedQuestions.includes(q.id) && q.type === "essay")
                        .map((q: typeof allQuestions[0]) => q.id);
                    const nonEssays = selectedQuestions.filter((id: string) => !essays.includes(id));

                    const shuffledNonEssays = [...nonEssays].sort(() => Math.random() - 0.5);
                    orderedQuestions = [...shuffledNonEssays, ...essays];
                } else {
                    orderedQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);
                }
            } else if (t.essayAtEnd) {
                // Just move essays to end without randomizing
                const essays = allQuestions
                    .filter((q: typeof allQuestions[0]) => selectedQuestions.includes(q.id) && q.type === "essay")
                    .map((q: typeof allQuestions[0]) => q.id);
                const nonEssays = selectedQuestions.filter((id: string) => !essays.includes(id));
                orderedQuestions = [...nonEssays, ...essays];
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
