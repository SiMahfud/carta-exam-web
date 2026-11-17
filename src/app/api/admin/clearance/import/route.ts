import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, studentClearances } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth-guard";

interface RawExcelRow {
    [key: string]: any;
}

function normalizeStatus(value: any): "locked" | "cleared" | "dispensation" | null {
    if (!value) return null;
    const str = String(value).trim().toLowerCase();

    if (["locked", "terkunci", "kunci", "nunggak", "belum", "blokir"].includes(str)) {
        return "locked";
    }
    if (["dispensation", "dispensasi", "izin", "sementara"].includes(str)) {
        return "dispensation";
    }
    if (["cleared", "bebas", "lunas", "sudah", "ok", "clear"].includes(str)) {
        return "cleared";
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth(["admin", "teacher"]);

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const mode = (formData.get("mode") as string) || "preview"; // preview | process

        if (!file) {
            return NextResponse.json({ error: "File Excel tidak ditemukan" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: RawExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rawData.length === 0) {
            return NextResponse.json({ error: "File Excel kosong atau tidak terbaca" }, { status: 400 });
        }

        // Fetch all students for username matching
        const allStudents = await (db as any)
            .select({
                id: users.id,
                username: users.username,
                name: users.name,
            })
            .from(users)
            .where(eq(users.role, "student"));

        const studentMapByUsername = new Map<string, { id: string; name: string }>();
        allStudents.forEach((s: any) => {
            studentMapByUsername.set(String(s.username).trim().toLowerCase(), {
                id: s.id,
                name: s.name,
            });
        });

        // Parse and validate rows
        const parsedItems: Array<{
            rowNumber: number;
            nis: string;
            studentId?: string;
            nama: string;
            originalStatus: string;
            normalizedStatus: "locked" | "cleared" | "dispensation";
            catatan: string;
            isValid: boolean;
            errorMessage?: string;
        }> = [];

        let toLock = 0;
        let toClear = 0;
        let toDispense = 0;
        let notFound = 0;

        rawData.forEach((row, index) => {
            // Find NIS / Username column
            const nisRaw = row["NIS"] || row["nis"] || row["Username"] || row["username"] || row["No Induk"] || "";
            const nis = String(nisRaw).trim();

            if (!nis) return; // Skip empty rows

            // Find status column
            const statusRaw = row["Status"] || row["status"] || row["Status_Administrasi"] || row["Status Administrasi"] || "";
            const normalizedStatus = normalizeStatus(statusRaw) || "locked"; // default to locked if in debt list

            // Find catatan column
            const catatanRaw = row["Catatan"] || row["catatan"] || row["Keterangan"] || row["keterangan"] || row["Notes"] || "";
            const catatan = String(catatanRaw).trim();

            // Find nama column (if present in Excel, or resolve from DB)
            const namaRaw = row["Nama"] || row["nama"] || row["Nama Siswa"] || "";

            const studentInfo = studentMapByUsername.get(nis.toLowerCase());

            if (!studentInfo) {
                notFound++;
                parsedItems.push({
                    rowNumber: index + 2,
                    nis,
                    nama: String(namaRaw) || "Tidak Ditemukan",
                    originalStatus: String(statusRaw),
                    normalizedStatus,
                    catatan,
                    isValid: false,
                    errorMessage: "NIS tidak terdaftar sebagai siswa",
                });
            } else {
                if (normalizedStatus === "locked") toLock++;
                else if (normalizedStatus === "dispensation") toDispense++;
                else if (normalizedStatus === "cleared") toClear++;

                parsedItems.push({
                    rowNumber: index + 2,
                    nis,
                    studentId: studentInfo.id,
                    nama: studentInfo.name,
                    originalStatus: String(statusRaw),
                    normalizedStatus,
                    catatan,
                    isValid: true,
                });
            }
        });

        // 1. Preview Mode: Return analyzed summary
        if (mode === "preview") {
            return NextResponse.json({
                success: true,
                mode: "preview",
                summary: {
                    total: parsedItems.length,
                    valid: parsedItems.filter(i => i.isValid).length,
                    toLock,
                    toClear,
                    toDispense,
                    notFound,
                },
                items: parsedItems.slice(0, 100), // Preview first 100
            });
        }

        // 2. Process Mode: Save updates into database
        const validItems = parsedItems.filter(i => i.isValid && i.studentId);
        const now = new Date();
        let updatedCount = 0;

        for (const item of validItems) {
            const studentId = item.studentId!;
            const existing = await (db as any)
                .select()
                .from(studentClearances)
                .where(eq(studentClearances.studentId, studentId))
                .limit(1);

            if (existing.length > 0) {
                await (db as any)
                    .update(studentClearances)
                    .set({
                        status: item.normalizedStatus,
                        notes: item.catatan || existing[0].notes,
                        updatedBy: user.id,
                        updatedAt: now,
                    })
                    .where(eq(studentClearances.id, existing[0].id));
            } else {
                await (db as any)
                    .insert(studentClearances)
                    .values({
                        id: crypto.randomUUID(),
                        studentId,
                        status: item.normalizedStatus,
                        notes: item.catatan || null,
                        updatedBy: user.id,
                        updatedAt: now,
                    });
            }
            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            mode: "process",
            message: `Berhasil memperbarui status administrasi untuk ${updatedCount} siswa.`,
            updatedCount,
            summary: {
                totalProcessed: updatedCount,
                toLock,
                toClear,
                toDispense,
                notFound,
            }
        });
    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message || "Gagal memproses file Excel" }, { status: error.status || 500 });
    }
}
