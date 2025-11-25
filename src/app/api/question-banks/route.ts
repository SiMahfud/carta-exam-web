import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questionBanks, subjects, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/question-banks - List all question banks
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const subjectId = searchParams.get("subjectId");

        let query = db.select({
            id: questionBanks.id,
            name: questionBanks.name,
            description: questionBanks.description,
            subjectId: questionBanks.subjectId,
            subjectName: subjects.name,
            createdBy: questionBanks.createdBy,
            creatorName: users.name,
            createdAt: questionBanks.createdAt,
            updatedAt: questionBanks.updatedAt,
        })
            .from(questionBanks)
            .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
            .leftJoin(users, eq(questionBanks.createdBy, users.id));

        if (subjectId) {
            query = query.where(eq(questionBanks.subjectId, subjectId));
        }

        const banks = await query.orderBy(questionBanks.createdAt);

        return NextResponse.json(banks);
    } catch (error) {
        console.error("Error fetching question banks:", error);
        return NextResponse.json(
            { error: "Failed to fetch question banks" },
            { status: 500 }
        );
    }
}

// POST /api/question-banks - Create new question bank
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, subjectId, createdBy } = body;

        if (!name || !subjectId) {
            return NextResponse.json(
                { error: "Name and subject ID are required" },
                { status: 400 }
            );
        }

        const newBank = await db.insert(questionBanks).values({
            name,
            description,
            subjectId,
            createdBy: createdBy || null, // Optional - set to null if not provided
        }).returning();

        return NextResponse.json(newBank[0], { status: 201 });
    } catch (error) {
        console.error("Error creating question bank:", error);
        return NextResponse.json(
            { error: "Failed to create question bank" },
            { status: 500 }
        );
    }
}
