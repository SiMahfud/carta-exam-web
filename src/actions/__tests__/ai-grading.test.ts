import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateEssayWithAI } from "../ai-grading";
import * as authGuard from "@/lib/auth-guard";

describe("evaluateEssayWithAI", () => {
    const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-1",
            role: "teacher",
            name: "Guru Test",
        });
    });

    afterEach(() => {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
    });

    it("should return error if API key is missing", async () => {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        const res = await evaluateEssayWithAI({
            questionText: "Jelaskan hukum Newton 1",
            studentAnswer: "Benda akan diam jika resultan gaya nol",
            maxPoints: 10,
        });

        expect(res.success).toBe(false);
        expect(res.error).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    });

    it("should handle empty student answer with 0 score", async () => {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = "dummy-key";

        const res = await evaluateEssayWithAI({
            questionText: "Jelaskan proses fotosintesis",
            studentAnswer: "",
            maxPoints: 10,
        });

        expect(res.success).toBe(true);
        expect(res.suggestedScore).toBe(0);
        expect(res.feedback).toContain("tidak memberikan jawaban");
        expect(res.improvements).toContain("Jawaban kosong.");
    });
});
