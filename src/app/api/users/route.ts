import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get("role");

        let query = db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            role: users.role,
        }).from(users);

        if (role) {
            // @ts-ignore - role is validated by enum in schema but here it's string
            query = query.where(eq(users.role, role));
        }

        const allUsers = await query.orderBy(users.name);

        return NextResponse.json(allUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
