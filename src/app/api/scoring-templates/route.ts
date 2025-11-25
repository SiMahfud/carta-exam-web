import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoringTemplates } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/scoring-templates - List all scoring templates
export async function GET() {
    try {
        const templates = await db.select()
            .from(scoringTemplates)
            .orderBy(scoringTemplates.createdAt);

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching scoring templates:", error);
        return NextResponse.json(
            { error: "Failed to fetch scoring templates" },
            { status: 500 }
        );
    }
}

// POST /api/scoring-templates - Create new scoring template
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, defaultWeights, allowPartialCredit, partialCreditRules } = body;

        if (!name || !defaultWeights) {
            return NextResponse.json(
                { error: "Name and default weights are required" },
                { status: 400 }
            );
        }

        const newTemplate = await db.insert(scoringTemplates).values({
            name,
            description,
            defaultWeights,
            allowPartialCredit: allowPartialCredit ?? true,
            partialCreditRules,
        }).returning();

        return NextResponse.json(newTemplate[0], { status: 201 });
    } catch (error) {
        console.error("Error creating scoring template:", error);
        return NextResponse.json(
            { error: "Failed to create scoring template" },
            { status: 500 }
        );
    }
}

// PUT /api/scoring-templates/[id] - Update template (inline for simplicity)
// DELETE /api/scoring-templates/[id] - Delete template
