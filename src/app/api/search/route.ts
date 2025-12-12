import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, classes, subjects, bankQuestions, examTemplates, examSessions, questionBanks } from "@/lib/schema";
import { like, or } from "drizzle-orm";

interface SearchResult {
    questions: Array<{ id: string; text: string; type: string; subjectName: string }>;
    exams: Array<{ id: string; name: string; status: string; type: 'template' | 'session' }>;
    students: Array<{ id: string; name: string; username: string }>;
    classes: Array<{ id: string; name: string; grade: number }>;
    subjects: Array<{ id: string; name: string }>;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.trim();
        const limit = parseInt(searchParams.get("limit") || "5");

        if (!query || query.length < 2) {
            return NextResponse.json({
                data: {
                    questions: [],
                    exams: [],
                    students: [],
                    classes: [],
                    subjects: []
                }
            });
        }

        const searchPattern = `%${query}%`;

        // Search questions (from bankQuestions - content is JSON)
        const questionResults = await db
            .select({
                id: bankQuestions.id,
                content: bankQuestions.content,
                type: bankQuestions.type,
                bankId: bankQuestions.bankId,
            })
            .from(bankQuestions)
            .limit(limit * 2); // Get more since we filter in-memory

        // Filter questions by content match
        const filteredQuestions = questionResults.filter((q: typeof questionResults[0]) => {
            try {
                const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                const questionText = content?.question || content?.text || '';
                return questionText.toLowerCase().includes(query.toLowerCase());
            } catch {
                return false;
            }
        }).slice(0, limit);

        // Get bank -> subject mapping
        const bankIds = Array.from(new Set(filteredQuestions.map((q: typeof filteredQuestions[0]) => q.bankId)));
        const subjectMap = new Map<string, string>();

        if (bankIds.length > 0) {
            const banks = await db
                .select({ id: questionBanks.id, subjectId: questionBanks.subjectId })
                .from(questionBanks);

            const subjectData = await db
                .select({ id: subjects.id, name: subjects.name })
                .from(subjects);

            const subjectNames = new Map<string, string>(subjectData.map((s: typeof subjectData[0]) => [s.id, s.name] as [string, string]));
            banks.forEach((b: typeof banks[0]) => subjectMap.set(b.id, subjectNames.get(b.subjectId) || 'Unknown'));
        }

        // Search exam templates
        const templateResults = await db
            .select({
                id: examTemplates.id,
                name: examTemplates.name,
            })
            .from(examTemplates)
            .where(like(examTemplates.name, searchPattern))
            .limit(limit);

        // Search exam sessions (uses sessionName, not name)
        const sessionResults = await db
            .select({
                id: examSessions.id,
                name: examSessions.sessionName,
                status: examSessions.status,
            })
            .from(examSessions)
            .where(like(examSessions.sessionName, searchPattern))
            .limit(limit);

        // Search students (users)
        const studentResults = await db
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
            })
            .from(users)
            .where(
                or(
                    like(users.name, searchPattern),
                    like(users.username, searchPattern)
                )
            )
            .limit(limit);

        // Search classes
        const classResults = await db
            .select({
                id: classes.id,
                name: classes.name,
                grade: classes.grade,
            })
            .from(classes)
            .where(like(classes.name, searchPattern))
            .limit(limit);

        // Search subjects
        const subjectResults = await db
            .select({
                id: subjects.id,
                name: subjects.name,
            })
            .from(subjects)
            .where(like(subjects.name, searchPattern))
            .limit(limit);

        const result: SearchResult = {
            questions: filteredQuestions.map((q: typeof filteredQuestions[0]) => {
                const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                const questionText = content?.question || content?.text || '';
                return {
                    id: q.id,
                    text: questionText.replace(/<[^>]*>/g, '').substring(0, 100),
                    type: q.type,
                    subjectName: subjectMap.get(q.bankId) || 'Unknown'
                };
            }),
            exams: [
                ...templateResults.map((t: typeof templateResults[0]) => ({ id: t.id, name: t.name, status: 'template', type: 'template' as const })),
                ...sessionResults.map((s: typeof sessionResults[0]) => ({ id: s.id, name: s.name, status: s.status, type: 'session' as const }))
            ],
            students: studentResults.filter((s: typeof studentResults[0]) => s.username !== 'admin'),
            classes: classResults,
            subjects: subjectResults
        };

        return NextResponse.json({ data: result });

    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Gagal melakukan pencarian" },
            { status: 500 }
        );
    }
}
