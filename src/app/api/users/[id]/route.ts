import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/users/[id] - Get single user
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
        const user = await db
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, params.id))
            .limit(1);

        if (user.length === 0) {
            return NextResponse.json(
                { error: "User tidak ditemukan" },
                { status: 404 }
            );
        }

        return NextResponse.json(user[0]);
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { error: "Gagal mengambil data user" },
            { status: 500 }
        );
    }
}

// PUT /api/users/[id] - Update user
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin"]);
        const body = await request.json();
        const { name, username, password, role } = body;

        // Check if user exists
        const existingUser = await db
            .select({ id: users.id, username: users.username })
            .from(users)
            .where(eq(users.id, params.id))
            .limit(1);

        if (existingUser.length === 0) {
            return NextResponse.json(
                { error: "User tidak ditemukan" },
                { status: 404 }
            );
        }

        // Check for duplicate username (if changing username)
        if (username && username !== existingUser[0].username) {
            const duplicateUser = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            if (duplicateUser.length > 0) {
                return NextResponse.json(
                    { error: "Username sudah digunakan" },
                    { status: 409 }
                );
            }
        }

        // Validate role
        const validRoles = ["admin", "teacher", "student"];
        if (role && !validRoles.includes(role)) {
            return NextResponse.json(
                { error: "Role tidak valid" },
                { status: 400 }
            );
        }

        // Build update data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        if (name) updateData.name = name;
        if (username) updateData.username = username;
        if (role) updateData.role = role;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        await db.update(users).set(updateData).where(eq(users.id, params.id));

        // Return updated user without password
        const updatedUser = await db
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, params.id))
            .limit(1);

        return NextResponse.json(updatedUser[0]);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: (error as any)?.message || "Gagal mengupdate user" },
            { status: (error as any)?.status || 500 }
        );
    }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin"]);
        // Check if user exists
        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, params.id))
            .limit(1);

        if (existingUser.length === 0) {
            return NextResponse.json(
                { error: "User tidak ditemukan" },
                { status: 404 }
            );
        }

        // Delete user
        await db.delete(users).where(eq(users.id, params.id));

        return NextResponse.json({ message: "User berhasil dihapus" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Gagal menghapus user" },
            { status: 500 }
        );
    }
}
