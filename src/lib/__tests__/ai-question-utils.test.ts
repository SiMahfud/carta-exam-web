import { describe, it, expect } from "vitest";
import {
    normalizeAndValidateQuestions,
    parseAIJson,
    normalizeRawQuestion,
    cleanJson,
} from "../ai-question-utils";

describe("AI Question Utilities", () => {
    describe("cleanJson & parseAIJson", () => {
        it("should parse standard JSON inside markdown code fence", () => {
            const raw = "```json\n{\n  \"questions\": [\n    {\n      \"type\": \"mc\",\n      \"difficulty\": \"medium\",\n      \"content\": { \"question\": \"Apa itu HTML?\", \"options\": [\"A\", \"B\", \"C\", \"D\", \"E\"] },\n      \"answerKey\": { \"correct\": 0 }\n    }\n  ]\n}\n```";
            const parsed = parseAIJson(raw);
            expect(parsed.questions).toBeDefined();
            expect(parsed.questions.length).toBe(1);
        });

        it("should parse JSON with surrounding conversational text", () => {
            const raw = "Berikut adalah soal yang dibuat:\n\n```json\n{\"questions\": [{\"type\": \"mc\", \"difficulty\": \"easy\", \"content\": {\"question\": \"1+1?\", \"options\": [\"1\", \"2\", \"3\", \"4\", \"5\"]}, \"answerKey\": {\"correct\": 1}}]}\n```\nSemoga membantu!";
            const parsed = parseAIJson(raw);
            expect(parsed.questions.length).toBe(1);
        });

        it("should handle LaTeX backslashes without breaking JSON", () => {
            const raw = '{"questions": [{"type": "mc", "difficulty": "medium", "content": {"question": "Hitung $\\frac{1}{2} + \\alpha$", "options": ["$\\frac{1}{4}$", "$\\frac{3}{4}$", "$1$", "$2$", "$0$"]}, "answerKey": {"correct": 1}}]}';
            const parsed = parseAIJson(raw);
            expect(parsed.questions[0].content.question).toContain("frac");
        });

        it("should handle trailing commas in arrays and objects", () => {
            const raw = '{\n  "questions": [\n    {\n      "type": "mc",\n      "difficulty": "easy",\n      "content": {\n        "question": "Test?",\n        "options": ["A", "B", "C", "D", "E"],\n      },\n      "answerKey": {\n        "correct": 0,\n      },\n    },\n  ],\n}';
            const parsed = parseAIJson(raw);
            expect(parsed.questions.length).toBe(1);
        });
    });

    describe("normalizeRawQuestion", () => {
        it("should normalize questions where 'question' is at root instead of inside 'content'", () => {
            const raw = {
                type: "mc",
                difficulty: "medium",
                question: "Berapakah ibukota Jawa Barat?",
                options: ["Bandung", "Surabaya", "Semarang", "Medan", "Jakarta"],
                answerKey: { correct: "A" }
            };

            const normalized = normalizeRawQuestion(raw, 0);
            expect(normalized).not.toBeNull();
            expect(normalized?.content.question).toBe("Berapakah ibukota Jawa Barat?");
            expect(normalized?.content.options).toEqual(["Bandung", "Surabaya", "Semarang", "Medan", "Jakarta"]);
            expect(normalized?.answerKey?.correct).toBe(0); // 'A' converted to index 0
        });

        it("should normalize questions where 'content' is a plain string", () => {
            const raw = {
                type: "mc",
                content: "Apa warna daun yang sehat?",
                options: ["Hijau", "Merah", "Kuning", "Biru", "Hitam"],
                correct: "A"
            };

            const normalized = normalizeRawQuestion(raw, 0);
            expect(normalized?.content.question).toBe("Apa warna daun yang sehat?");
            expect(normalized?.content.options?.length).toBe(5);
            expect(normalized?.answerKey?.correct).toBe(0);
        });

        it("should normalize complex MC with letter array in answerKey", () => {
            const raw = {
                type: "complex_mc",
                difficulty: "hard",
                content: {
                    question: "Pilihlah bilangan prima!",
                    options: ["2", "3", "4", "5", "6"]
                },
                answerKey: {
                    correctIndices: ["A", "B", "D"]
                }
            };

            const normalized = normalizeRawQuestion(raw, 0);
            expect(normalized?.type).toBe("complex_mc");
            expect(normalized?.answerKey?.correctIndices).toEqual([0, 1, 3]);
        });

        it("should normalize True/False with boolean answer", () => {
            const raw = {
                type: "true_false",
                content: {
                    question: "Matahari terbit dari timur."
                },
                correct: true
            };

            const normalized = normalizeRawQuestion(raw, 0);
            expect(normalized?.type).toBe("true_false");
            expect(normalized?.content.options).toEqual(["Benar", "Salah"]);
            expect(normalized?.answerKey?.correct).toBe(0);
        });

        it("should normalize Matching questions with string arrays", () => {
            const raw = {
                type: "matching",
                content: {
                    question: "Cocokkan ibukota negara!",
                    leftItems: ["Indonesia", "Jepang"],
                    rightItems: ["Jakarta", "Tokyo"]
                },
                answerKey: {
                    matches: [
                        { from: 0, to: 0 },
                        { from: 1, to: 1 }
                    ]
                }
            };

            const normalized = normalizeRawQuestion(raw, 0);
            expect(normalized?.type).toBe("matching");
            expect(normalized?.content.leftItems).toEqual([
                { id: "l1", text: "Indonesia" },
                { id: "l2", text: "Jepang" }
            ]);
            expect(normalized?.answerKey?.matches).toEqual([
                { leftId: "l1", rightId: "r1" },
                { leftId: "l2", rightId: "r2" }
            ]);
        });

        it("should normalize Short Answer and Essay questions", () => {
            const shortRaw = {
                type: "short_answer",
                question: "Siapa presiden pertama Indonesia?",
                answer: "Soekarno"
            };
            const shortNorm = normalizeRawQuestion(shortRaw, 0);
            expect(shortNorm?.type).toBe("short");
            expect(shortNorm?.answerKey?.acceptedAnswers).toEqual(["Soekarno"]);

            const essayRaw = {
                type: "essay",
                question: "Jelaskan hukum Newton 1!",
                rubric: "Menjelaskan tentang kelembaman benda."
            };
            const essayNorm = normalizeRawQuestion(essayRaw, 1);
            expect(essayNorm?.type).toBe("essay");
            expect(essayNorm?.answerKey?.modelAnswer).toBe("Menjelaskan tentang kelembaman benda.");
        });
    });

    describe("normalizeAndValidateQuestions (Full Flow)", () => {
        it("should successfully recover when AI produces a list where question 8 has root level 'question'", () => {
            const questions = [];
            for (let i = 0; i < 10; i++) {
                if (i === 8) {
                    // Simulating the exact error encountered by the user
                    questions.push({
                        type: "mc",
                        difficulty: "medium",
                        question: "Soal nomor 9 dengan format tanpa content wrapper",
                        options: ["A", "B", "C", "D", "E"],
                        answerKey: { correct: 2 }
                    });
                } else {
                    questions.push({
                        type: "mc",
                        difficulty: "medium",
                        content: {
                            question: `Soal nomor ${i + 1}`,
                            options: ["A", "B", "C", "D", "E"]
                        },
                        answerKey: { correct: 0 }
                    });
                }
            }

            const rawJson = JSON.stringify({ questions });
            const result = normalizeAndValidateQuestions(rawJson);

            expect(result.length).toBe(10);
            expect(result[8].content.question).toBe("Soal nomor 9 dengan format tanpa content wrapper");
            expect(result[8].content.options?.length).toBe(5);
        });

        it("should accept raw array directly without 'questions' object wrapper", () => {
            const rawArray = [
                {
                    type: "mc",
                    difficulty: "easy",
                    content: { question: "Soal 1?", options: ["A", "B", "C", "D", "E"] },
                    answerKey: { correct: 0 }
                },
                {
                    type: "mc",
                    difficulty: "hard",
                    content: { question: "Soal 2?", options: ["A", "B", "C", "D", "E"] },
                    answerKey: { correct: 1 }
                }
            ];

            const result = normalizeAndValidateQuestions(JSON.stringify(rawArray));
            expect(result.length).toBe(2);
        });
    });
});
