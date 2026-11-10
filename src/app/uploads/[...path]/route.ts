import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mapping common MIME types
const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
    try {
        const resolvedParams = await context.params;
        const pathSegments = resolvedParams?.path;

        if (!pathSegments || !Array.isArray(pathSegments) || pathSegments.length === 0) {
            return new NextResponse("File Not Found", { status: 404 });
        }

        // Security check: reject any directory traversal attempts
        for (const segment of pathSegments) {
            if (segment === ".." || segment === "." || segment.includes("/") || segment.includes("\\")) {
                return new NextResponse("Forbidden", { status: 403 });
            }
        }

        const safeRelPath = pathSegments.join(path.sep);
        const uploadsRoot = path.join(process.cwd(), "public", "uploads");
        const fullPath = path.join(uploadsRoot, safeRelPath);

        // Ensure target file stays strictly inside uploads directory
        const normalizedFullPath = path.normalize(fullPath);
        if (!normalizedFullPath.startsWith(path.normalize(uploadsRoot))) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(normalizedFullPath)) {
            return new NextResponse("File Not Found", { status: 404 });
        }

        const stat = await fs.promises.stat(normalizedFullPath);
        if (!stat.isFile()) {
            return new NextResponse("Not a file", { status: 400 });
        }

        const ext = path.extname(normalizedFullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const fileBuffer = await fs.promises.readFile(normalizedFullPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": stat.size.toString(),
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving upload file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

