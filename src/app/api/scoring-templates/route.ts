import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoringTemplates } from "@/lib/schema";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/scoring-templates - List all scoring templates
export async function GET() {
    try {
        await requireAuth(["admin", "teacher"]);
        const templates = await db.select()
            .from(scoringTemplates)
            .orderBy(scoringTemplates.createdAt);

        return NextResponse.json(templates);
    } catch (error: any) {
        console.error("Error fetching scoring templates:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch scoring templates" },
            { status: error.status || 500 }
        );
    }
}

// POST /api/scoring-templates - Create new scoring template
export async function POST(request: Request) {
    try {
        await requireAuth(["admin", "teacher"]);
        const body = await request.json();
        const { name, description, defaultWeights, allowPartialCredit, partialCreditRules } = body;

        if (!name || !defaultWeights) {
            return NextResponse.json(
                { error: "Name and default weights are required" },
                { status: 400 }
            );
        }

        const id = crypto.randomUUID();
        const newTemplateValues = {
            id,
            name,
            description,
            defaultWeights,
            allowPartialCredit: allowPartialCredit ?? true,
            partialCreditRules,
        };

        await db.insert(scoringTemplates).values(newTemplateValues);

        return NextResponse.json(newTemplateValues, { status: 201 });
    } catch (error: any) {
        console.error("Error creating scoring template:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create scoring template" },
            { status: error.status || 500 }
        );
    }
}
