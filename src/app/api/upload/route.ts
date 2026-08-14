import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { requireAuth } from "@/lib/auth-guard";

// Allowed MIME types and their safe extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
    try {
        // Enforce admin or teacher authentication for file uploads
        await requireAuth(["admin", "teacher"]);

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "File tidak ditemukan dalam request" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Ukuran file melebihi batas maksimal (5 MB)" },
                { status: 400 }
            );
        }

        // Validate MIME type
        const mimeType = file.type?.toLowerCase();
        if (!mimeType || !ALLOWED_MIME_TYPES[mimeType]) {
            return NextResponse.json(
                { error: "Tipe file tidak didukung. Hanya file gambar (JPG, PNG, WebP, GIF, SVG) dan PDF yang diperbolehkan." },
                { status: 400 }
            );
        }

        const safeExtension = ALLOWED_MIME_TYPES[mimeType];

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Create a unique safe filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `file-${uniqueSuffix}${safeExtension}`;
        const filepath = path.join(uploadDir, filename);

        // Write file safely
        await writeFile(filepath, buffer);

        // Return public URL
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl, filename, size: file.size });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Terjadi kesalahan saat mengunggah file" },
            { status: error.status || 500 }
        );
    }
}
