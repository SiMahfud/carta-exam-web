'use server'

import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "@/lib/auth-guard";

export interface AIGradingRequest {
    questionText: string;
    studentAnswer: string;
    maxPoints: number;
    guidelines?: string;
    rubric?: Array<{ points?: number; score?: number; criteria: string; description?: string }>;
    modelAnswer?: string;
}

export interface AIGradingResult {
    success: boolean;
    suggestedScore?: number;
    feedback?: string;
    strengths?: string[];
    improvements?: string[];
    error?: string;
}

export async function evaluateEssayWithAI(payload: AIGradingRequest): Promise<AIGradingResult> {
    try {
        await requireAuth(["admin", "teacher"]);

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Kunci API Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY) belum dikonfigurasi pada server.",
            };
        }

        if (!payload.studentAnswer || !payload.studentAnswer.trim()) {
            return {
                success: true,
                suggestedScore: 0,
                feedback: "Siswa tidak memberikan jawaban.",
                strengths: [],
                improvements: ["Jawaban kosong."],
            };
        }

        const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash";
        const ai = new GoogleGenAI({ apiKey });

        const rubricText = payload.rubric && payload.rubric.length > 0
            ? payload.rubric
                .map((r, i) => `- Kriteria ${i + 1} (${r.points ?? r.score ?? "?"} poin): ${r.criteria || r.description || ""}`)
                .join("\n")
            : "Tidak ada rubrik terperinci khusus.";

        const prompt = `Anda adalah asisten guru profesional yang ahli dalam menilai jawaban esai dan isian siswa secara objektif, adil, dan konstruktif.

Tugas Anda adalah menilai jawaban esai siswa berdasarkan pertanyaan, pedoman penilaian, dan rubrik berikut:

---
PERTANYAAN SOAL:
${payload.questionText}

PEDOMAN / MODEL JAWABAN GURU:
${payload.guidelines || payload.modelAnswer || "Gunakan pemahaman konsep akademis standar untuk pertanyaan di atas."}

RUBRIK PENILAIAN:
${rubricText}

SKOR MAKSIMAL:
${payload.maxPoints} poin

JAWABAN SISWA:
${payload.studentAnswer}
---

Instruksi Penilaian:
1. Berikan skor numerik yang adil antara 0 sampai ${payload.maxPoints} (boleh bilangan desimal seperti 8.5 jika sesuai).
2. Tuliskan umpan balik/catatan penilaian (feedback) dalam Bahasa Indonesia yang sopan, mendidik, dan jelas.
3. Sebutkan poin-poin kelebihan (strengths) dan area yang perlu ditingkatkan (improvements).
4. Kembalikan HANYA format JSON valid tanpa tanda markdown tambahan (tanpa backticks \`\`\`json):

{
  "suggestedScore": number,
  "feedback": "string catatan untuk siswa/guru",
  "strengths": ["kelebihan 1", "kelebihan 2"],
  "improvements": ["kekurangan/saran perbaikan 1"]
}`;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                temperature: 0.2, // Low temperature for deterministic and consistent grading
                responseMimeType: "application/json",
            },
        });

        const responseText = response.text?.trim() || "{}";
        let parsed: any;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            // Attempt cleanup if backticks were accidentally included
            const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            parsed = JSON.parse(cleaned);
        }

        const validScore = Math.min(
            Math.max(Number(parsed.suggestedScore ?? 0), 0),
            payload.maxPoints
        );

        return {
            success: true,
            suggestedScore: Math.round(validScore * 10) / 10,
            feedback: parsed.feedback || "Penilaian telah dihitung berdasarkan rubrik.",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        };
    } catch (err: any) {
        console.error("AI Grading Error:", err);
        return {
            success: false,
            error: err.message || "Gagal melakukan penilaian dengan AI.",
        };
    }
}
