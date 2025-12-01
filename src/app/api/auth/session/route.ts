import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";

// GET /api/auth/session - Get current user session
export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            role: user.role
        }
    });
}
