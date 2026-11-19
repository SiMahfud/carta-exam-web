import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, classStudents, classes, studentClearances } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["admin", "teacher"]);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // template | export
        const classId = searchParams.get("classId");

        // 1. Template Download
        if (type === "template") {
            const templateData = [
                {
                    NIS: "10291",
                    Nama: "Ahmad Rizky (Contoh Terkunci)",
                    Status: "locked",
                    Catatan: "Menunggak administrasi SPP bulan Oktober & November"
                },
                {
                    NIS: "10292",
                    Nama: "Siti Rahmawati (Contoh Bebas)",
                    Status: "cleared",
                    Catatan: "Administrasi lunas"
                },
                {
                    NIS: "10293",
                    Nama: "Budi Santoso (Contoh Dispensasi)",
                    Status: "dispensation",
                    Catatan: "Dispensasi ujian sampai tanggal 25 Nov"
                }
            ];

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(templateData);

            worksheet["!cols"] = [
                { wch: 15 }, // NIS
                { wch: 35 }, // Nama
                { wch: 18 }, // Status
                { wch: 55 }, // Catatan
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, "Format_Administrasi");

            // Instructions Sheet
            const petunjukData = [
                { "Kolom": "NIS", "Wajib": "YA", "Keterangan": "Nomor Induk Siswa (username login siswa di CartaExam)" },
                { "Kolom": "Nama", "Wajib": "TIDAK", "Keterangan": "Nama siswa (hanya untuk memudahkan pembacaan)" },
                { "Kolom": "Status", "Wajib": "YA", "Keterangan": "Pilihan nilai: locked (terkunci), cleared (bebas/lunas), dispensation (dispensasi)" },
                { "Kolom": "Catatan", "Wajib": "TIDAK", "Keterangan": "Catatan atau alasan dari pihak TU yang akan terbaca di sistem" },
            ];
            const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);
            wsPetunjuk["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 65 }];
            XLSX.utils.book_append_sheet(workbook, wsPetunjuk, "Petunjuk_Pengisian");

            const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

            return new NextResponse(buffer, {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": 'attachment; filename="template_administrasi_siswa.xlsx"'
                }
            });
        }

        // 2. Export Actual Students Clearance Data
        let conditions = [eq(users.role, "student")];

        const studentsData = await (db as any)
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                classId: classes.id,
                className: classes.name,
                status: studentClearances.status,
                notes: studentClearances.notes,
                validUntil: studentClearances.validUntil,
            })
            .from(users)
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .leftJoin(studentClearances, eq(users.id, studentClearances.studentId))
            .where(and(...conditions))
            .orderBy(classes.name, users.name);

        const filteredData = classId && classId !== "all"
            ? studentsData.filter((s: any) => s.classId === classId)
            : studentsData;

        const now = new Date();
        const rows = filteredData.map((s: any) => {
            const isExpired = s.status === "dispensation" && s.validUntil && new Date(s.validUntil) < now;
            const statusKey = isExpired ? "locked" : (s.status || "cleared");
            let statusLabel = "Bebas Ujian";
            if (statusKey === "locked") statusLabel = "Terkunci";
            if (statusKey === "dispensation") statusLabel = "Dispensasi";

            return {
                NIS: s.username,
                Nama: s.name,
                Kelas: s.className || "Tanpa Kelas",
                Status: statusKey,
                Status_Teks: statusLabel,
                Catatan: s.notes || "",
            };
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 15 }, // NIS
            { wch: 32 }, // Nama
            { wch: 16 }, // Kelas
            { wch: 16 }, // Status
            { wch: 18 }, // Status_Teks
            { wch: 50 }, // Catatan
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Administrasi");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="data_administrasi_siswa.xlsx"'
            }
        });
    } catch (error: any) {
        console.error("Export error:", error);
        return NextResponse.json({ error: error.message || "Gagal mengekspor data" }, { status: error.status || 500 });
    }
}
