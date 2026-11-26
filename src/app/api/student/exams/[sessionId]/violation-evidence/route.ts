import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { requireAuth } from "@/lib/auth-guard";

const ALLOWED_IMAGE_MIME: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

const MAX_EVIDENCE_SIZE = 2 * 1024 * 1024; // 2 MB

// POST /api/student/exams/[sessionId]/violation-evidence - Upload screenshot evidence from CartaExambro
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await requireAuth(["student", "admin", "teacher"]);
        const { sessionId } = await params;

        // Sanitize sessionId for filesystem usage
        const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
        if (!safeSessionId) {
            return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const bodyStudentId = formData.get("studentId") as string | null;
        const studentId = user.role === "student" ? user.id : (bodyStudentId || user.id);

        if (!file) {
            return NextResponse.json(
                { error: "File screenshot tidak ditemukan" },
                { status: 400 }
            );
        }

        if (file.size > MAX_EVIDENCE_SIZE) {
            return NextResponse.json(
                { error: "Ukuran screenshot melebihi batas maksimal 2 MB" },
                { status: 400 }
            );
        }

        const mimeType = file.type?.toLowerCase();
        const ext = mimeType ? ALLOWED_IMAGE_MIME[mimeType] : undefined;
        if (!ext) {
            return NextResponse.json(
                { error: "Format gambar harus JPG, PNG, atau WebP" },
                { status: 400 }
            );
        }

        // Verify student has an active submission in this session
        const activeSubmission = await db.select({
            id: submissions.id,
            status: submissions.status,
        })
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (activeSubmission.length === 0) {
            return NextResponse.json(
                { error: "No active submission" },
                { status: 404 }
            );
        }

        if (activeSubmission[0].status !== "in_progress") {
            return NextResponse.json(
                { error: "Ujian sudah selesai atau dihentikan" },
                { status: 409 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public", "uploads", "violations", safeSessionId);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const evidenceUrl = `/uploads/violations/${safeSessionId}/${filename}`;
        return NextResponse.json({
            success: true,
            evidenceUrl,
            size: file.size,
        });
    } catch (error: unknown) {
        const err = error as { message?: string; status?: number };
        console.error("Error uploading violation evidence:", error);
        return NextResponse.json(
            { error: err.message || "Gagal mengunggah bukti screenshot" },
            { status: err.status || 500 }
        );
    }
}
