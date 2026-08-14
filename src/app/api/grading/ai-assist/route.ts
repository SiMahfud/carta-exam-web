import { NextRequest, NextResponse } from "next/server";
import { evaluateEssayWithAI } from "@/actions/ai-grading";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
    try {
        await requireAuth(["admin", "teacher"]);
        const body = await req.json();

        const result = await evaluateEssayWithAI({
            questionText: body.questionText || "",
            studentAnswer: body.studentAnswer || "",
            maxPoints: Number(body.maxPoints || 10),
            guidelines: body.guidelines,
            rubric: body.rubric,
            modelAnswer: body.modelAnswer,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: err.status || 500 }
        );
    }
}
