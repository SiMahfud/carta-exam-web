'use server'

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
// zodToJsonSchema removed - not currently used after commenting out responseSchema

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
    console.warn("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey });

// Define Zod Schema for Structured Output
const GeneratedQuestionSchema = z.object({
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

// Use a wrapper object for better stability with Gemini JSON mode
const GeneratedQuestionsListSchema = z.object({
    questions: z.array(GeneratedQuestionSchema).describe("A list of generated exam questions."),
});

export type GenerationOptions = {
    type: "mc" | "essay" | "short" | "true_false" | "matching" | "complex_mc" | "all";
    count: number;
    difficulty: "easy" | "medium" | "hard";
    topic?: string;
    questionDistribution?: Partial<Record<"mc" | "essay" | "short" | "true_false" | "matching" | "complex_mc", number>>;
};

const cleanJson = (text: string): string => {
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?|\n?```/g, "");

    // Robust cleaning to handle LaTeX backslashes
    // Strategy:
    // 1. Match known SAFE escape sequences first and preserve them (Double backslashes, newline, quotes, unicode).
    // 2. Any other backslash is considered a "bad" LaTeX escape (e.g., \alpha instead of \\alpha) and is doubled.
    // Note: We deliberately exclude \b, \f, \r, \t from safe list because in the context of LaTeX, 
    // \beta, \frac, \rho, \theta are common and we want them to become \\beta, \\frac, etc.
    return text.replace(/(\\\\|\\n|\\"|\\\/|\\u[0-9a-fA-F]{4})|(\\)/g, (match, safe, unsafe) => {
        if (safe) return safe;
        return "\\\\";
    });
};

export async function generateQuestions(
    promptText: string,
    contextFile?: { base64: string; mimeType: string },
    options?: GenerationOptions
): Promise<z.infer<typeof GeneratedQuestionSchema>[]> {
    try {
        if (!apiKey) throw new Error("API Key configuration error");

        const qType = options?.type || "mc";
        let qCount = options?.count || 5;
        const qDiff = options?.difficulty || "medium";

        // Construct requirement string based on distribution or single type
        let requirementDesc = "";
        if (options?.questionDistribution && Object.keys(options.questionDistribution).length > 0) {
            const dist = options.questionDistribution;
            const parts = Object.entries(dist).map(([t, c]) => `${c} questions of type '${t}'`);
            requirementDesc = `Generate a total of ${Object.values(dist).reduce((a, b) => a + b, 0)} questions with this specific distribution: ${parts.join(", ")}.`;
            qCount = Object.values(dist).reduce((a, b) => a + b, 0);
        } else {
            requirementDesc = `Generate ${qCount} exam questions of type "${qType}" (or mixed if type is 'all')`;
        }

        // Structured input for Gemini
        // We explicitly ask for the JSON structure matching our schema
        const parts: any[] = [
            {
                text: `
You are an expert exam question generator.
${requirementDesc} with difficulty "${qDiff}".
Topic: ${options?.topic || "Context provided"}.

IMPORTANT: For "short" type questions, the generated question must be answerable with a single word or a short phrase (1-2 words max). The "acceptedAnswers" in the output MUST NOT be full sentences.
For "matching" type questions, you CAN generate one-to-many relationships (e.g., one left item matches multiple right items).
CRITICAL: When using LaTeX for math formulas (e.g., \\frac, \\theta), you MUST escape the backslashes in your JSON output.
Example: Use "\\\\frac" instead of "\\frac", and "\\\\theta" instead of "\\theta".
Output valid JSON only.

LANGUAGE INSTRUCTION:
Generate ALL content (questions, options, answers) in INDONESIAN (Bahasa Indonesia), UNLESS the topic is explicitly about learning a foreign language (e.g., "English Lesson", "Japanese Grammar"). In that case, use the target language where appropriate.

OPTION COUNT INSTRUCTION:
For "mc" (Multiple Choice) questions, you MUST provide EXACTLY 5 options (A, B, C, D, E). Do not provide fewer than 5 options.

OUTPUT FORMAT:
Return a single valid JSON object with the key "questions".
The value MUST be an array of objects, NOT strings.

Example of expected JSON structure:
{
  "questions": [
    {
      "type": "mc",
      "difficulty": "medium",
      "content": { "question": "Question with math: $\\\\frac{1}{2}$", "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E"] },
      "answerKey": { "correct": 0 }
    },
    {
      "type": "complex_mc",
      "difficulty": "hard",
      "content": { "question": "Question?", "options": ["A", "B", "C"] },
      "answerKey": { "correctIndices": [0, 2] }
    },
    {
      "type": "matching",
      "difficulty": "medium",
      "content": {
        "question": "Match items (One-to-Many supported)",
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
      "content": { "question": "Langit berwarna biru?", "options": ["Benar", "Salah"] },
      "answerKey": { "correct": 0 } 
    },
    {
      "type": "short",
      "difficulty": "medium",
      "content": { "question": "1 + 1 = ?" },
      "answerKey": { "acceptedAnswers": ["2", "Dua"] } 
    },
    {
      "type": "essay",
      "difficulty": "medium",
      "content": { "question": "Jelaskan kenapa bumi bulat!" },
      "answerKey": { "modelAnswer": "Bumi bulat karena..." }
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

        const requestContents = parts;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: requestContents,
            config: {
                responseMimeType: "application/json",
                // Removing strict schema constraint as it seems to cause mode collapse (returning simple numbers)
                // responseSchema: zodToJsonSchema(GeneratedQuestionsListSchema as any) as any,
            }
        });

        const text = response.text;

        if (!text) throw new Error("No response from AI");

        // Debug logging
        console.log("Gemini Raw Response:", text);

        // Sanitize JSON before parsing
        const cleanedText = cleanJson(text);

        let json;
        try {
            json = JSON.parse(cleanedText);
        } catch (parseError) {
            console.warn("JSON Parse failed even after cleaning. Trying original...", parseError);
            json = JSON.parse(text); // Fallback to original if regex broke something, though unlikely for valid JSON
        }

        // Validate with Zod
        // We expect { questions: [...] }
        const result = GeneratedQuestionsListSchema.parse(json);

        // NORMALIZATION: Fix common AI hallucinations/schema mismatches
        const normalizedQuestions = result.questions.map(q => {
            // Ensure answerKey exists
            if (!q.answerKey) {
                q.answerKey = {};
            }

            // Fix 1: AI sometimes returns 'correct' int for 'complex_mc' instead of 'correctIndices' array
            if (q.type === 'complex_mc') {
                if (q.answerKey.correctIndices === undefined && typeof q.answerKey.correct === 'number') {
                    q.answerKey.correctIndices = [q.answerKey.correct];
                }
            }

            // Fix 2: AI matches normalization (from/to indices -> leftId/rightId)
            if (q.type === 'matching' && q.content.leftItems && q.content.rightItems && q.answerKey.matches) {
                q.answerKey.matches = q.answerKey.matches.map((m: any) => {
                    // Start by checking if we have numbers (indices)
                    if (typeof m.from === 'number' && typeof m.to === 'number') {
                        const left = q.content.leftItems?.[m.from];
                        const right = q.content.rightItems?.[m.to];
                        if (left && right) {
                            return { leftId: left.id, rightId: right.id };
                        }
                    }
                    // Handle case where it used 'from' / 'to' but with strings (maybe IDs already?)
                    if (m.from && m.to && !m.leftId) {
                        return { leftId: m.from, rightId: m.to };
                    }
                    // Otherwise assume it's correct or keep as is
                    return m;
                });
            }

            // Fix 3: True/False normalization (boolean/string -> index)
            if (q.type === 'true_false') {
                if (!q.content.options || q.content.options.length === 0) {
                    q.content.options = ["True", "False"];
                }

                if (typeof q.answerKey.correct === 'boolean') {
                    q.answerKey.correct = q.answerKey.correct ? 0 : 1;
                } else if (typeof q.answerKey.correct === 'string') {
                    // Handle case where AI returns "True" or "False" strings
                    const val = q.answerKey.correct.toLowerCase();
                    if (val === 'true') q.answerKey.correct = 0;
                    else if (val === 'false') q.answerKey.correct = 1;
                }
            }

            // Fix 4: Short/Essay normalization (string 'correct' -> acceptedAnswers/modelAnswer)
            if ((q.type === 'short' || q.type === 'essay') && typeof q.answerKey.correct === 'string') {
                if (q.type === 'short') {
                    if (!q.answerKey.acceptedAnswers) {
                        q.answerKey.acceptedAnswers = [q.answerKey.correct];
                    }
                } else if (q.type === 'essay') {
                    if (!q.answerKey.modelAnswer) {
                        q.answerKey.modelAnswer = q.answerKey.correct;
                    }
                }
            }

            return q;
        });

        return normalizedQuestions;

    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw new Error("Failed to generate questions with AI");
    }
}
