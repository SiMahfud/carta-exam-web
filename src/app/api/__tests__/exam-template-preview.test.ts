import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "../exam-templates/[id]/preview/route";
import * as authGuardModule from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("Exam Template Preview & Print API", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    const mockTemplate = {
        id: "tpl-123",
        name: "LATIHAN SOAL INFORMATIKA KELAS X 2026",
        subjectId: "sub-1",
        bankIds: JSON.stringify(["bank-1"]),
        questionComposition: JSON.stringify({ mc: 4 }),
        durationMinutes: 60,
        totalScore: 100,
        randomizeQuestions: true,
        randomizeAnswers: false,
        randomizationRules: JSON.stringify({
            mode: "exclude_type",
            excludeTypes: ["mc"],
            shuffleAnswers: false,
        }),
        essayAtEnd: true,
    };

    // Deliberately unsorted in database return order to test sorting
    const mockBankQuestions = [
        {
            id: "q-3",
            bankId: "bank-1",
            type: "mc",
            questionNumber: 3,
            content: JSON.stringify({ question: "Soal nomor 3", options: ["A", "B", "C", "D"] }),
            answerKey: JSON.stringify({ correct: 0 }),
            createdAt: new Date("2026-01-01T10:03:00Z"),
        },
        {
            id: "q-1",
            bankId: "bank-1",
            type: "mc",
            questionNumber: 1,
            content: JSON.stringify({ question: "Soal nomor 1", options: ["A", "B", "C", "D"] }),
            answerKey: JSON.stringify({ correct: 1 }),
            createdAt: new Date("2026-01-01T10:01:00Z"),
        },
        {
            id: "q-4",
            bankId: "bank-1",
            type: "mc",
            questionNumber: 4,
            content: JSON.stringify({ question: "Soal nomor 4", options: ["A", "B", "C", "D"] }),
            answerKey: JSON.stringify({ correct: 2 }),
            createdAt: new Date("2026-01-01T10:04:00Z"),
        },
        {
            id: "q-2",
            bankId: "bank-1",
            type: "mc",
            questionNumber: 2,
            content: JSON.stringify({ question: "Soal nomor 2", options: ["A", "B", "C", "D"] }),
            answerKey: JSON.stringify({ correct: 3 }),
            createdAt: new Date("2026-01-01T10:02:00Z"),
        },
    ];

    it("POST /api/exam-templates/[id]/preview preserves bank order when mc is excluded from randomization", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        let callCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return { limit: vi.fn().mockResolvedValue([mockTemplate]) };
                    }
                    return Promise.resolve(mockBankQuestions);
                }),
            }),
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-templates/tpl-123/preview", {
            method: "POST",
            body: JSON.stringify({ seed: "test-seed" }),
        });

        const res = await POST(req, { params: { id: "tpl-123" } });
        const json = await res.json();

        expect(json.questions).toHaveLength(4);
        expect(json.questions[0].questionText).toBe("Soal nomor 1");
        expect(json.questions[1].questionText).toBe("Soal nomor 2");
        expect(json.questions[2].questionText).toBe("Soal nomor 3");
        expect(json.questions[3].questionText).toBe("Soal nomor 4");
        expect(json.metadata.randomizationApplied).toBe(false);
    });

    it("GET /api/exam-templates/[id]/preview returns questions in bank order for print", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        let callCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return { limit: vi.fn().mockResolvedValue([mockTemplate]) };
                    }
                    if (callCount === 2) {
                        // subject
                        return { limit: vi.fn().mockResolvedValue([{ name: "Informatika" }]) };
                    }
                    // bank questions
                    return Promise.resolve(mockBankQuestions);
                }),
            }),
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-templates/tpl-123/preview");
        const res = await GET(req, { params: { id: "tpl-123" } });
        const json = await res.json();

        expect(json.questions).toHaveLength(4);
        expect(json.questions[0].id).toBe("q-1");
        expect(json.questions[1].id).toBe("q-2");
        expect(json.questions[2].id).toBe("q-3");
        expect(json.questions[3].id).toBe("q-4");
    });
});
