'use server'

import { generateAIContent } from "@/lib/ai-provider";
import {
    buildQuestionPrompt,
    normalizeAndValidateQuestions,
    GeneratedQuestionSchema,
    type GenerationOptions,
} from "@/lib/ai-question-utils";
import { z } from "zod";

// Re-export types for backward compatibility with existing imports
export type { GenerationOptions } from "@/lib/ai-question-utils";

export async function generateQuestions(
    promptText: string,
    contextFile?: { base64: string; mimeType: string },
    options?: GenerationOptions
): Promise<z.infer<typeof GeneratedQuestionSchema>[]> {
    try {
        const { parts } = buildQuestionPrompt(promptText, contextFile, options);

        const response = await generateAIContent({
            prompt: parts,
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        console.log("AI Raw Response:", text);

        return normalizeAndValidateQuestions(text);

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Failed to generate questions with AI");
    }
}
