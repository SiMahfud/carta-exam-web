import { z } from "zod";

export const OptionSchema = z.object({
    label: z.string(), // A, B, C...
    text: z.string().min(1, "Option text cannot be empty")
});

export const MatchingPairSchema = z.object({
    left: z.string(),
    right: z.string()
});

export const BankQuestionSchema = z.object({
    type: z.enum(["mc", "complex_mc", "matching", "short", "essay", "true_false"]),
    content: z.object({
        question: z.string().min(1, "Question text cannot be empty"),
        options: z.union([
            z.array(z.string()), // Simple MC (strings)
            z.array(z.object({ // Complex MC or future objects
                id: z.string().optional(),
                label: z.string().optional(),
                text: z.string(),
                isCorrect: z.boolean().optional()
            })),
            z.undefined()
        ]).optional(),
        leftItems: z.array(z.object({
            id: z.string(),
            text: z.string()
        })).optional(),
        rightItems: z.array(z.object({
            id: z.string(),
            text: z.string()
        })).optional()
    }),
    answerKey: z.object({
        correct: z.number().optional(), // Index for MC
        correctIndices: z.array(z.number()).optional(), // Indices for Complex MC
        matches: z.array(z.object({
            leftId: z.string(),
            rightId: z.string()
        })).optional(),
        acceptedAnswers: z.array(z.string()).optional(), // Short answer
        caseSensitive: z.boolean().optional(),
        modelAnswer: z.string().optional(), // Essay
        answer: z.string().optional() // True/False specific
    }),
    tags: z.array(z.string()).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    defaultPoints: z.number().default(1),
    metadata: z.any().optional()
});

export const ImportQuestionsSchema = z.array(BankQuestionSchema);
