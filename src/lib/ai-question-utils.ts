/**
 * Shared utilities for AI question generation.
 * Extracted from actions/ai.ts so they can be used by both
 * the server action and the streaming API route without
 * the 'use server' constraint.
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas
// ============================================================================

export const GeneratedQuestionSchema = z.object({
    type: z.enum(["mc", "true_false", "essay", "short", "complex_mc", "matching"]),
    content: z.object({
        question: z.string().describe("The text of the question."),
        options: z.array(z.string()).optional().describe("For MC/Complex MC. A list of option text."),
        leftItems: z.array(z.object({
            id: z.string(),
            text: z.string()
        })).optional().describe("For Matching. Items on the left side."),
        rightItems: z.array(z.object({
            id: z.string(),
            text: z.string()
        })).optional().describe("For Matching. Items on the right side."),
    }),
    answerKey: z.object({
        correct: z.union([z.number(), z.boolean(), z.string()]).optional().describe("For MC (single choice). Index of the correct option (0-based). For True/False: 0=True, 1=False."),
        correctIndices: z.array(z.number()).optional().describe("For Complex MC. Array of correct option indices."),
        // Relaxed schema to allow normalization from AI's "from/to" format
        matches: z.array(z.any()).optional().describe("For Matching. Pairs of matching IDs."),
        acceptedAnswers: z.array(z.string()).optional().describe("For Short Answer. List of valid answer strings."),
        modelAnswer: z.string().optional().describe("For Essay. Key points or model answer text."),
    }).optional(), // Made optional because AI sometimes omits it for open-ended questions
    difficulty: z.enum(["easy", "medium", "hard"]).describe("The difficulty level of the question."),
});

export const GeneratedQuestionsListSchema = z.object({
    questions: z.array(GeneratedQuestionSchema).describe("A list of generated exam questions."),
});

// ============================================================================
// Types
// ============================================================================

export type GenerationOptions = {
    type: "mc" | "essay" | "short" | "true_false" | "matching" | "complex_mc" | "all";
    count: number;
    difficulty: "easy" | "medium" | "hard";
    topic?: string;
    questionDistribution?: Partial<Record<"mc" | "essay" | "short" | "true_false" | "matching" | "complex_mc", number>>;
};

// ============================================================================
// Utilities
// ============================================================================

export const cleanJson = (text: string): string => {
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?|\n?```/g, "");

    // Robust cleaning to handle LaTeX backslashes
    // Strategy:
    // 1. Match known SAFE escape sequences first and preserve them (Double backslashes, newline, quotes, unicode).
    // 2. Any other backslash is considered a "bad" LaTeX escape (e.g., \alpha instead of \\alpha) and is doubled.
    return text.replace(/(\\\\|\\n|\\"|\\\/|\\u[0-9a-fA-F]{4})|(\\)/g, (match, safe, _unsafe) => {
        if (safe) return safe;
        return "\\\\";
    });
};

/**
 * Safely parse JSON from raw AI text, handling markdown fences, surrounding commentary,
 * LaTeX escapes, and trailing commas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAIJson(rawText: string): any {
    if (!rawText || !rawText.trim()) {
        throw new Error("AI tidak menghasilkan teks respons.");
    }

    let text = rawText.trim();

    // 1. Remove markdown code blocks if present
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
        text = markdownMatch[1].trim();
    }

    // 2. If text still contains non-JSON prefix/suffix, find outer { } or [ ]
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = text.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endIdx = text.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        text = text.substring(startIdx, endIdx + 1);
    }

    // 3. Try direct JSON.parse first
    try {
        return JSON.parse(text);
    } catch {
        // Continue to cleaning & repairing
    }

    // 4. Clean LaTeX / unescaped backslashes
    const cleaned = cleanJson(text);
    try {
        return JSON.parse(cleaned);
    } catch {
        // Continue to remove trailing commas and repair
    }

    // 5. Remove trailing commas in objects and arrays
    const repaired = cleaned.replace(/,\s*([}\]])/g, '$1');
    try {
        return JSON.parse(repaired);
    } catch {
        // 6. Try parsing original rawText as last resort
        try {
            return JSON.parse(rawText);
        } catch {
            console.warn("All JSON parsing strategies failed. Raw text slice:", rawText.slice(0, 300));
            throw new Error("Gagal membaca struktur JSON dari respons AI. Silakan coba generate kembali.");
        }
    }
}

/**
 * Pre-normalize a single raw question object produced by AI before Zod validation.
 * Handles missing 'content' wrappers, string content, top-level options, letter-based answer keys, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRawQuestion(raw: any, index: number): z.infer<typeof GeneratedQuestionSchema> | null {
    if (!raw || typeof raw !== 'object') return null;

    // 1. Extract question text from diverse possible structures
    let questionText = "";
    if (typeof raw.content === 'string') {
        questionText = raw.content;
    } else if (raw.content && typeof raw.content === 'object') {
        questionText = raw.content.question || raw.content.text || raw.content.prompt || raw.content.soal || raw.content.pertanyaan || raw.content.title || raw.content.body || "";
    }
    if (!questionText) {
        questionText = raw.question || raw.text || raw.prompt || raw.soal || raw.pertanyaan || raw.title || raw.body || "";
    }
    if (typeof questionText !== 'string' || !questionText.trim()) {
        questionText = `Soal ${index + 1}`;
    }
    questionText = questionText.trim();

    // 2. Determine and normalize question type
    const rawType = (raw.type || "").toString().toLowerCase().trim();
    let type: "mc" | "true_false" | "essay" | "short" | "complex_mc" | "matching" = "mc";

    if (["mc", "multiple_choice", "pilihan_ganda", "pg", "single_choice", "multiple-choice"].includes(rawType)) {
        type = "mc";
    } else if (["complex_mc", "complex", "multiple_select", "pg_kompleks", "multi_choice", "checkbox", "complex-mc"].includes(rawType)) {
        type = "complex_mc";
    } else if (["true_false", "tf", "boolean", "benar_salah", "benar-salah", "true-false"].includes(rawType)) {
        type = "true_false";
    } else if (["matching", "match", "menjodohkan", "jodohkan"].includes(rawType)) {
        type = "matching";
    } else if (["short", "short_answer", "isian", "isian_singkat", "short-answer"].includes(rawType)) {
        type = "short";
    } else if (["essay", "uraian", "long", "essay_answer", "long_answer"].includes(rawType)) {
        type = "essay";
    } else {
        // Infer type from content structure
        if (raw.content?.leftItems || raw.leftItems || raw.content?.matches || raw.matches || raw.content?.rightItems || raw.rightItems) {
            type = "matching";
        } else if (raw.answerKey?.acceptedAnswers || raw.acceptedAnswers) {
            type = "short";
        } else if (raw.answerKey?.modelAnswer || raw.modelAnswer) {
            type = "essay";
        } else if (raw.answerKey?.correctIndices || raw.correctIndices) {
            type = "complex_mc";
        } else {
            type = "mc";
        }
    }

    // 3. Extract and normalize options
    const rawOptions = raw.content?.options || raw.options || raw.choices || raw.pilihan || raw.answers;
    let options: string[] | undefined = undefined;

    if (Array.isArray(rawOptions)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options = rawOptions.map((opt: any) => {
            if (typeof opt === 'string') return opt;
            if (opt && typeof opt === 'object') {
                return opt.text || opt.option || opt.label || opt.value || opt.content || JSON.stringify(opt);
            }
            return String(opt ?? "");
        }).filter(Boolean);
    }

    if (type === 'true_false') {
        if (!options || options.length < 2) {
            options = ["Benar", "Salah"];
        } else {
            options = options.slice(0, 2);
        }
    } else if ((type === 'mc' || type === 'complex_mc') && (!options || options.length === 0)) {
        options = ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E"];
    }

    // 4. Extract and normalize leftItems and rightItems (for matching)
    const rawLeft = raw.content?.leftItems || raw.leftItems || raw.left || raw.kiri;
    const rawRight = raw.content?.rightItems || raw.rightItems || raw.right || raw.kanan;
    let leftItems: Array<{ id: string; text: string }> | undefined = undefined;
    let rightItems: Array<{ id: string; text: string }> | undefined = undefined;

    if (type === 'matching') {
        if (Array.isArray(rawLeft)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            leftItems = rawLeft.map((item: any, idx: number) => {
                if (typeof item === 'string') return { id: `l${idx + 1}`, text: item };
                if (item && typeof item === 'object') {
                    return {
                        id: String(item.id || `l${idx + 1}`),
                        text: String(item.text || item.label || item.value || `Item ${idx + 1}`)
                    };
                }
                return { id: `l${idx + 1}`, text: String(item ?? "") };
            });
        }
        if (Array.isArray(rawRight)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rightItems = rawRight.map((item: any, idx: number) => {
                if (typeof item === 'string') return { id: `r${idx + 1}`, text: item };
                if (item && typeof item === 'object') {
                    return {
                        id: String(item.id || `r${idx + 1}`),
                        text: String(item.text || item.label || item.value || `Item ${idx + 1}`)
                    };
                }
                return { id: `r${idx + 1}`, text: String(item ?? "") };
            });
        }
    }

    // 5. Extract and normalize AnswerKey
    const rawAnswerKey = (raw.answerKey && typeof raw.answerKey === 'object') ? raw.answerKey : {};
    const rawCorrect = rawAnswerKey.correct !== undefined 
        ? rawAnswerKey.correct 
        : (raw.correct !== undefined ? raw.correct : (raw.correctAnswer !== undefined ? raw.correctAnswer : (raw.kunci !== undefined ? raw.kunci : (raw.jawaban !== undefined ? raw.jawaban : undefined))));

    // Helper to convert letter ('A', 'B', 'C'...) to index 0, 1, 2...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const letterToIndex = (val: any): number | undefined => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const trimmed = val.trim().toUpperCase();
            if (/^[A-Z]$/.test(trimmed)) {
                return trimmed.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1...
            }
            const num = parseInt(trimmed, 10);
            if (!isNaN(num)) return num;
        }
        return undefined;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answerKey: Record<string, any> = {};

    if (type === 'mc') {
        let correctIdx = letterToIndex(rawCorrect);
        if (correctIdx === undefined && typeof rawCorrect === 'string' && options) {
            const foundIdx = options.findIndex(o => o.trim().toLowerCase() === rawCorrect.trim().toLowerCase());
            if (foundIdx !== -1) correctIdx = foundIdx;
        }
        answerKey.correct = correctIdx !== undefined ? correctIdx : 0;
    } else if (type === 'true_false') {
        if (typeof rawCorrect === 'boolean') {
            answerKey.correct = rawCorrect ? 0 : 1;
        } else if (typeof rawCorrect === 'string') {
            const val = rawCorrect.toLowerCase().trim();
            if (val === 'true' || val === 'benar' || val === 'a') {
                answerKey.correct = 0;
            } else if (val === 'false' || val === 'salah' || val === 'b') {
                answerKey.correct = 1;
            } else {
                answerKey.correct = 0;
            }
        } else if (typeof rawCorrect === 'number') {
            answerKey.correct = rawCorrect === 1 ? 1 : 0;
        } else {
            answerKey.correct = 0;
        }
    } else if (type === 'complex_mc') {
        const rawIndices = rawAnswerKey.correctIndices || raw.correctIndices || rawAnswerKey.correct || raw.correct;
        let indices: number[] = [];
        if (Array.isArray(rawIndices)) {
            indices = rawIndices.map(letterToIndex).filter((idx): idx is number => idx !== undefined);
        } else if (rawIndices !== undefined) {
            const idx = letterToIndex(rawIndices);
            if (idx !== undefined) indices = [idx];
        }
        if (indices.length === 0) indices = [0];
        answerKey.correctIndices = indices;
    } else if (type === 'matching') {
        const rawMatches = rawAnswerKey.matches || raw.matches || [];
        if (Array.isArray(rawMatches)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            answerKey.matches = rawMatches.map((m: any) => {
                if (typeof m.from === 'number' && typeof m.to === 'number') {
                    const left = leftItems?.[m.from];
                    const right = rightItems?.[m.to];
                    if (left && right) {
                        return { leftId: left.id, rightId: right.id };
                    }
                }
                if (m.from && m.to && !m.leftId) {
                    return { leftId: String(m.from), rightId: String(m.to) };
                }
                if (m.left && m.right && !m.leftId) {
                    return { leftId: String(m.left), rightId: String(m.right) };
                }
                if (m.leftId && m.rightId) {
                    return { leftId: String(m.leftId), rightId: String(m.rightId) };
                }
                return m;
            });
        } else {
            answerKey.matches = [];
        }
    } else if (type === 'short') {
        const accepted = rawAnswerKey.acceptedAnswers || raw.acceptedAnswers || rawCorrect || raw.answer;
        if (Array.isArray(accepted)) {
            answerKey.acceptedAnswers = accepted.map(String).filter(Boolean);
        } else if (typeof accepted === 'string' && accepted.trim()) {
            answerKey.acceptedAnswers = [accepted.trim()];
        } else {
            answerKey.acceptedAnswers = ["Jawaban"];
        }
    } else if (type === 'essay') {
        const model = rawAnswerKey.modelAnswer || raw.modelAnswer || rawCorrect || raw.answer || raw.rubric;
        if (typeof model === 'string') {
            answerKey.modelAnswer = model;
        } else if (Array.isArray(model)) {
            answerKey.modelAnswer = model.join("\n");
        } else {
            answerKey.modelAnswer = "";
        }
    }

    // 6. Normalize difficulty
    const rawDiff = (raw.difficulty || raw.level || raw.tingkatKesulitan || "").toString().toLowerCase().trim();
    let difficulty: "easy" | "medium" | "hard" = "medium";
    if (["easy", "mudah"].includes(rawDiff)) difficulty = "easy";
    else if (["hard", "sulit", "sukar"].includes(rawDiff)) difficulty = "hard";
    else difficulty = "medium";

    // 7. Assemble normalized object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized: any = {
        type,
        difficulty,
        content: {
            question: questionText,
            ...(options ? { options } : {}),
            ...(leftItems ? { leftItems } : {}),
            ...(rightItems ? { rightItems } : {}),
        },
        answerKey,
    };

    return normalized;
}

/**
 * Build the AI prompt parts for question generation.
 * Used by both the server action and the streaming API route.
 */
export function buildQuestionPrompt(
    promptText: string,
    contextFile?: { base64: string; mimeType: string },
    options?: GenerationOptions
): { parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>; qCount: number } {
    const qType = options?.type || "mc";
    let qCount = options?.count || 5;
    const qDiff = options?.difficulty || "medium";

    let requirementDesc = "";
    if (options?.questionDistribution && Object.keys(options.questionDistribution).length > 0) {
        const dist = options.questionDistribution;
        const parts = Object.entries(dist).map(([t, c]) => `${c} questions of type '${t}'`);
        requirementDesc = `Generate a total of ${Object.values(dist).reduce((a, b) => a + b, 0)} questions with this specific distribution: ${parts.join(", ")}.`;
        qCount = Object.values(dist).reduce((a, b) => a + b, 0);
    } else {
        requirementDesc = `Generate ${qCount} exam questions of type "${qType}" (or mixed if type is 'all')`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [
        {
            text: `
You are an expert exam question generator.
${requirementDesc} with difficulty "${qDiff}".
Topic: ${options?.topic || "Context provided"}.

IMPORTANT: For "short" type questions, the generated question must be answerable with a single word or a short phrase (1-2 words max). The "acceptedAnswers" in the output MUST NOT be full sentences.
For "matching" type questions, you CAN generate one-to-many relationships (e.g., one left item matches multiple right items).
MATH/LATEX FORMATTING (CRITICAL - YOU MUST FOLLOW THIS):
1. ALL mathematical expressions, formulas, symbols, and equations MUST be wrapped with dollar signs ($...$) for KaTeX/LaTeX rendering.
2. This applies to EVERYTHING containing math: questions, answer options, model answers, and accepted answers.
3. Examples of what needs $ wrapping:
   - Variables: $x$, $y$, $n$
   - Fractions: $\\\\frac{1}{2}$
   - Exponents: $x^2$, $e^{-x}$
   - Greek letters: $\\\\alpha$, $\\\\beta$, $\\\\theta$
   - Equations: $E = mc^2$, $F = ma$
   - Expressions in options: "$2x + 3$", "$\\\\frac{a}{b}$", "$\\\\sqrt{16}$"
4. WRONG: "2x + 3" or "x^2" or "\\\\frac{1}{2}" (without $ signs)
5. CORRECT: "$2x + 3$" or "$x^2$" or "$\\\\frac{1}{2}$" (with $ signs)
6. When using LaTeX commands, escape backslashes in JSON: use "$\\\\\\\\frac{1}{2}$" not "$\\\\frac{1}{2}$"
Output valid JSON only.

LANGUAGE INSTRUCTION:
Generate ALL content (questions, options, answers) in INDONESIAN (Bahasa Indonesia), UNLESS the topic is explicitly about learning a foreign language (e.g., "English Lesson", "Japanese Grammar"). In that case, use the target language where appropriate.

OPTION COUNT INSTRUCTION:
For "mc" (Multiple Choice) questions, you MUST provide EXACTLY 5 options (A, B, C, D, E). Do not provide fewer than 5 options.

OUTPUT FORMAT:
Return a single valid JSON object with the key "questions".
The value MUST be an array of objects, NOT strings.
CRITICAL: Ensure every item has "content" with "question" string!

Example of expected JSON structure:
{
  "questions": [
    {
      "type": "mc",
      "difficulty": "medium",
      "content": { "question": "Berapakah hasil dari $\\\\frac{1}{2} + \\\\frac{1}{4}$?", "options": ["$\\\\frac{1}{4}$", "$\\\\frac{2}{4}$", "$\\\\frac{3}{4}$", "$\\\\frac{4}{4}$", "$\\\\frac{5}{4}$"] },
      "answerKey": { "correct": 2 }
    },
    {
      "type": "complex_mc",
      "difficulty": "hard",
      "content": { "question": "Manakah pernyataan yang benar?", "options": ["Pernyataan A", "Pernyataan B", "Pernyataan C", "Pernyataan D", "Pernyataan E"] },
      "answerKey": { "correctIndices": [0, 2] }
    },
    {
      "type": "matching",
      "difficulty": "medium",
      "content": {
        "question": "Pasangkan kelompok berikut:",
        "leftItems": [{"id": "l1", "text": "Buah"}, {"id": "l2", "text": "Sayur"}],
        "rightItems": [{"id": "r1", "text": "Apel"}, {"id": "r2", "text": "Pisang"}, {"id": "r3", "text": "Wortel"}]
      },
      "answerKey": {
        "matches": [
          {"leftId": "l1", "rightId": "r1"}, 
          {"leftId": "l1", "rightId": "r2"}, 
          {"leftId": "l2", "rightId": "r3"}
        ]
      }
    },
    {
      "type": "true_false",
      "difficulty": "easy",
      "content": { "question": "Langit berwarna biru pada siang hari yang cerah.", "options": ["Benar", "Salah"] },
      "answerKey": { "correct": 0 } 
    },
    {
      "type": "short",
      "difficulty": "medium",
      "content": { "question": "Ibukota Indonesia saat ini adalah?" },
      "answerKey": { "acceptedAnswers": ["Jakarta", "DKI Jakarta"] } 
    },
    {
      "type": "essay",
      "difficulty": "medium",
      "content": { "question": "Jelaskan proses terjadinya fotosintesis pada tumbuhan hijau!" },
      "answerKey": { "modelAnswer": "Fotosintesis adalah proses di mana tumbuhan menggunakan energi cahaya matahari..." }
    }
  ]
}

Ensure complete adherence to this schema for every question.
` },
        { text: promptText || "Generate questions based on the context provided." }
    ];

    if (contextFile) {
        parts.push({
            inlineData: {
                mimeType: contextFile.mimeType,
                data: contextFile.base64
            }
        });
    }

    return { parts, qCount };
}

/**
 * Parse raw JSON text from AI response and normalize/validate with Zod schema.
 * Tolerates variations in structure (such as missing content wrappers, option letters, etc.)
 * and recovers all valid questions.
 * Used by both the server action and the streaming API route.
 */
export function normalizeAndValidateQuestions(
    rawText: string
): z.infer<typeof GeneratedQuestionSchema>[] {
    const json = parseAIJson(rawText);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawList: any[] = [];
    if (Array.isArray(json)) {
        rawList = json;
    } else if (json && typeof json === 'object') {
        if (Array.isArray(json.questions)) {
            rawList = json.questions;
        } else if (Array.isArray(json.data)) {
            rawList = json.data;
        } else if (Array.isArray(json.items)) {
            rawList = json.items;
        } else if (Array.isArray(json.results)) {
            rawList = json.results;
        } else if (Array.isArray(json.soal)) {
            rawList = json.soal;
        } else if (Array.isArray(json.bankQuestions)) {
            rawList = json.bankQuestions;
        } else if (Array.isArray(json.bank_questions)) {
            rawList = json.bank_questions;
        } else {
            // Check if object has numerical keys {"0": {...}, "1": {...}}
            const values = Object.values(json);
            if (values.length > 0 && typeof values[0] === 'object') {
                rawList = values;
            }
        }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
        throw new Error("AI tidak menghasilkan daftar soal yang valid.");
    }

    const validatedQuestions: z.infer<typeof GeneratedQuestionSchema>[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < rawList.length; i++) {
        try {
            const normalized = normalizeRawQuestion(rawList[i], i);
            if (!normalized) continue;

            const parseResult = GeneratedQuestionSchema.safeParse(normalized);
            if (parseResult.success) {
                validatedQuestions.push(parseResult.data);
            } else {
                console.warn(`Soal index ${i} gagal validasi schema:`, parseResult.error.format());
                validationErrors.push(`Soal ${i + 1}: ${parseResult.error.issues.map(iss => iss.message).join(', ')}`);
            }
        } catch (itemErr) {
            console.warn(`Error normalizing question ${i}:`, itemErr);
        }
    }

    if (validatedQuestions.length === 0) {
        throw new Error(
            `Gagal memvalidasi format soal AI. ${validationErrors.length > 0 ? validationErrors.slice(0, 3).join('; ') : 'Format tidak sesuai.'}`
        );
    }

    return validatedQuestions;
}

