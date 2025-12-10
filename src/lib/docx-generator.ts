
import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    WidthType,
    TextRun,
    HeightRule,
    BorderStyle,
    AlignmentType,
    VerticalAlign,
    convertInchesToTwip
} from "docx";

export class DocxGenerator {
    static async generateQuestionBankTemplate(): Promise<Blob> {
        // We will create sections for each type.

        // --- TYPE 1: Pilihan Ganda ---
        const desc1 = [
            "- Jenis Pilihan Ganda (PG 1) untuk pilihan ganda yang sudah ditentukan pilihan opsinya, misal 4 opsi (A,B,C,D) atau 5 opsi (A,B,C,D,E).",
            "- Kolom jenis harus diisi angka 1",
            "- Biarkan OPSI JAWABAN kosong jika ada opsi yang tidak digunakan.",
            "- NOMOR soal yang tidak digunakan bisa dihapus atau dibiarkan kosong.",
            "- Soal dan jawaban bisa disisipi gambar",
            "- KUNCI hanya diisi satu jawaban.",
            "- Beri tanda v pada opsi jawaban benar (v huruf kecil atau V huruf besar)."
        ];

        const type1Data = [
            {
                no: "1",
                question: "Siapakah Presiden Indonesia pada tahun 1999?",
                type: "1",
                options: [
                    { c1: "A", c2: "Soekarno" },
                    { c1: "B", c2: "Soeharto" },
                    { c1: "C", c2: "B. J. Habibie", c3: "v" },
                    { c1: "D", c2: "Abdurrahman Wahid" },
                    { c1: "E", c2: "Megawati" },
                ]
            },
            {
                no: "2",
                question: "Ibukota negara Indonesia adalah...",
                type: "1",
                options: [
                    { c1: "A", c2: "Surabaya" },
                    { c1: "B", c2: "Jakarta", c3: "v" },
                    { c1: "C", c2: "Bandung" },
                    { c1: "D", c2: "Medan" },
                ]
            }
        ];

        // Add 20 empty placeholder rows for Type 1 as requested
        for (let i = 0; i < 20; i++) {
            type1Data.push({
                no: "",
                question: "",
                type: "1",
                options: [
                    { c1: "A", c2: "" },
                    { c1: "B", c2: "" },
                    { c1: "C", c2: "" },
                    { c1: "D", c2: "" },
                    { c1: "E", c2: "" },
                ]
            });
        }

        const table1 = this.createTableType1_2("1", type1Data);

        // --- TYPE 2: Pilihan Ganda Kompleks ---
        const desc2 = [
            "- Soal Pilihan Ganda Kompleks (PG 2) untuk soal yang opsi-jawabannya lebih banyak atau lebih sedikit dari PG 1",
            "- Kolom jenis harus diisi angka 2",
            "- Bisa digunakan untuk soal TRUE dan FALSE atau YES dan NO",
            "- KUNCI bisa diisi satu jawaban atau lebih",
            "- Opsi bisa ditambah atau dihapus sesuai kebutuhan jumlah opsi",
            "- Beri tanda v pada opsi jawaban benar."
        ];

        const table2 = this.createTableType1_2("2", [
            {
                no: "1",
                question: "Manakah diantaranya alat berikut ini yang merupakan peralatan dapur?",
                type: "2",
                options: [
                    { c1: "A", c2: "Cangkul" },
                    { c1: "B", c2: "Pisau", c3: "v" },
                    { c1: "C", c2: "Obeng" },
                    { c1: "D", c2: "Spatula", c3: "v" },
                    { c1: "E", c2: "Panci", c3: "v" },
                    { c1: "F", c2: "Keranjang" },
                ]
            },
            {
                no: "2",
                question: "Pilihlah pernyataan yang BENAR di bawah ini (bisa lebih dari satu)",
                type: "2",
                options: [
                    { c1: "A", c2: "Matahari terbit dari timur", c3: "v" },
                    { c1: "B", c2: "Air membeku pada suhu 100 derajat" },
                    { c1: "C", c2: "Ikan bernafas dengan insang", c3: "v" }
                ]
            },
            {
                no: "3",
                question: "Contoh soal dengan pilihan TRUE dan FALSE",
                type: "2",
                options: [
                    { c1: "A", c2: "Benar", c3: "v" },
                    { c1: "B", c2: "Salah" },
                ]
            }
        ], true); // Green header for Type 2

        // --- TYPE 3: Menjodohkan ---
        const desc3 = [
            "- Digunakan untuk soal yang berbentuk tabel atau menjodohkan",
            "- Pilihan yang jumlahnya lebih banyak sebaiknya disimpan sebagai BARIS",
            "- Kolom jenis harus diisi angka 3",
            "- KUNCI diisi jawaban yang cocok dari KODE BARIS dan KODE KOLOM",
            "- Jika jawaban lebih dari satu, pisahkan dengan koma"
        ];

        const table3 = this.createTableType3([
            {
                no: "1",
                question: "Cocokanlah peralatan dibawah ini sesuai tempat penggunannya",
                type: "3",
                options: [
                    { c1: "1", c2: "Peralatan Dapur", c3: "A", c4: "Cangkul", c5: "1", c6: "B, D, F" },
                    { c1: "2", c2: "Peralatan Kebun", c3: "B", c4: "Pisau", c5: "2", c6: "A, f" },
                    { c1: "3", c2: "Peralatan Tukang Bangunan", c3: "C", c4: "Obeng", c5: "3", c6: "C, G, H" },
                    { c1: "", c2: "", c3: "D", c4: "Spatula" },
                    { c1: "", c2: "", c3: "E", c4: "Panci" },
                    { c1: "", c2: "", c3: "F", c4: "Keranjang" },
                    { c1: "", c2: "", c3: "G", c4: "Gergaji" },
                    { c1: "", c2: "", c3: "H", c4: "Palu" },
                ]
            }
        ]);

        // --- TYPE 4: Isian Singkat ---
        const desc4 = [
            "- Kolom jenis harus diisi angka 4",
            "- Soal bisa disisipi gambar"
        ];

        const table4 = this.createTableType4_5_6("4", "IV. Soal Isian Singkat", "kuning", [
            { no: "1", question: "Siapa presiden pertama Indonesia?", type: "4", answer: "Soekarno" },
            { no: "2", question: "Binatang yang menyusui disebut...", type: "4", answer: "Mamalia" }
        ]);

        // --- TYPE 5: Uraian ---
        const desc5 = [
            "- Kolom jenis harus diisi angka 5",
            "- Jawaban uraian singkat sebagai kunci jawaban (opsional)"
        ];

        const table5 = this.createTableType4_5_6("5", "V. Soal Uraian", "biru", [
            { no: "1", question: "Jelaskan dampak pemanasan global!", type: "5", answer: "Suhu bumi meningkat, es kutub mencair..." },
            { no: "2", question: "Sebutkan 3 macam simbiosis!", type: "5", answer: "Mutualisme, Komensalisme, Parasitisme" }
        ]);

        // --- TYPE 6: Benar / Salah ---
        const desc6 = [
            "- Kolom jenis harus diisi angka 6",
            "- Isi jawaban dengan 'Benar' atau 'Salah' (Huruf besar/kecil tidak masalah)"
        ];

        const table6 = this.createTableType4_5_6("6", "VI. Soal Benar / Salah", "hijau", [
            { no: "1", question: "Matahari terbit dari timur.", type: "6", answer: "Benar" },
            { no: "2", question: "Air mendidih pada suhu 0 derajat celcius.", type: "6", answer: "Salah" },
            { no: "3", question: "Bumi itu datar.", type: "6", answer: "Salah" },
            { no: "4", question: "1 + 1 = 2", type: "6", answer: "Benar" }
        ]);

        const children = [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "TEMPLATE IMPORT SOAL",
                        bold: true,
                        size: 32, // 16pt
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),

            // Type 1 Section
            this.createSectionHeader("I. Soal Pilihan Ganda (satu jawaban benar)"),
            ...this.createDescriptionList(desc1),
            new Paragraph({ text: "" }),
            table1,
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Type 2 Section
            this.createSectionHeader("II. Soal Pilihan Ganda Kompleks (beberapa jawaban benar)"),
            ...this.createDescriptionList(desc2),
            new Paragraph({ text: "" }),
            table2,
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Type 3 Section
            this.createSectionHeader("III. Soal Menjodohkan"),
            ...this.createDescriptionList(desc3),
            new Paragraph({ text: "" }),
            table3,
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Type 4 Section
            this.createSectionHeader(desc4[0].replace("- ", "")), // Using text from desc? No, specific header
            // Re-using createTableType4_5_6 header prop logic in main flow
            ...this.createDescriptionList(["Kolom jenis harus diisi angka 4"]),
            new Paragraph({ text: "" }),
            table4,
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Type 5
            this.createSectionHeader("V. Soal Uraian"),
            ...this.createDescriptionList(desc5),
            new Paragraph({ text: "" }),
            table5,
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Type 6
            this.createSectionHeader("VI. Soal Benar / Salah"),
            ...this.createDescriptionList(desc6),
            new Paragraph({ text: "" }),
            table6,
        ];

        const doc = new Document({
            sections: [{ children }],
        });

        return await Packer.toBlob(doc);
    }

    private static createSectionHeader(text: string): Paragraph {
        return new Paragraph({
            children: [new TextRun({ text, bold: true, size: 24 })],
            spacing: { before: 200, after: 100 }
        });
    }

    private static createDescriptionList(items: string[]): Paragraph[] {
        return items.map(text => new Paragraph({ text, spacing: { after: 50 }, bullet: { level: 0 } }));
    }

    // Helper for Type 1 & 2
    private static createTableType1_2(type: string, data: any[], isGreen = false): Table {
        const headerColor = isGreen ? "C6EFCE" : "B4C6E7"; // Excel-like colors

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: ["NO", "SOAL", "JENIS", "OPSI", "JAWABAN", "KUNCI"].map(t =>
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })], alignment: AlignmentType.CENTER })],
                            shading: { fill: headerColor },
                            verticalAlign: VerticalAlign.CENTER,
                        })
                    ),
                    tableHeader: true,
                }),
                ...data.flatMap(d => this.createRowsForType1_2(d))
            ],
            borders: this.getBorders()
        });
    }

    private static createRowsForType1_2(data: any): TableRow[] {
        const rows: TableRow[] = [];
        data.options.forEach((opt: any, index: number) => {
            const isFirst = index === 0;
            rows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph(isFirst ? data.no : "")],
                        verticalMerge: isFirst ? "restart" : "continue",
                        width: { size: 5, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph(isFirst ? data.question : "")],
                        verticalMerge: isFirst ? "restart" : "continue",
                        width: { size: 40, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: isFirst ? data.type : "", alignment: AlignmentType.CENTER })],
                        verticalMerge: isFirst ? "restart" : "continue",
                        width: { size: 5, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({ children: [new Paragraph({ text: opt.c1, alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph(opt.c2)], width: { size: 40, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: opt.c3 || "", alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                ]
            }));
        });
        return rows;
    }

    // Helper for Type 3 (Matching)
    private static createTableType3(data: any[]): Table {
        const r1 = this.createType3HeaderRow1();
        const r2 = this.createType3HeaderRow2();

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                r1,
                r2,
                ...data.flatMap(d => this.createRowsForType3(d))
            ],
            borders: this.getBorders()
        });
    }

    private static createType3HeaderRow1(): TableRow {
        const color = "CCC0DA"; // Purple
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, verticalMerge: "restart" }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SOAL", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, verticalMerge: "restart" }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JENIS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, verticalMerge: "restart" }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "BARIS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, columnSpan: 2 }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KOLOM", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, columnSpan: 2 }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KUNCI", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, columnSpan: 2 }),
            ]
        });
    }

    private static createType3HeaderRow2(): TableRow {
        const color = "CCC0DA"; // Purple
        // 3 dummy for vertical merge + 6 real
        return new TableRow({
            children: [
                new TableCell({ children: [], shading: { fill: color }, verticalMerge: "continue" }),
                new TableCell({ children: [], shading: { fill: color }, verticalMerge: "continue" }),
                new TableCell({ children: [], shading: { fill: color }, verticalMerge: "continue" }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KODE", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NAMA BARIS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KODE", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NAMA KOLOM", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KODE BARIS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KODE KOLOM", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color } }),
            ]
        });
    }

    private static createRowsForType3(data: any): TableRow[] {
        const rows: TableRow[] = [];
        data.options.forEach((opt: any, index: number) => {
            const isFirst = index === 0;
            rows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(isFirst ? data.no : "")], verticalMerge: isFirst ? "restart" : "continue" }),
                    new TableCell({ children: [new Paragraph(isFirst ? data.question : "")], verticalMerge: isFirst ? "restart" : "continue" }),
                    new TableCell({ children: [new Paragraph({ text: isFirst ? data.type : "", alignment: AlignmentType.CENTER })], verticalMerge: isFirst ? "restart" : "continue" }),
                    new TableCell({ children: [new Paragraph({ text: opt.c1 || "", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(opt.c2 || "")] }),
                    new TableCell({ children: [new Paragraph({ text: opt.c3 || "", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(opt.c4 || "")] }),
                    new TableCell({ children: [new Paragraph({ text: opt.c5 || "", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: opt.c6 || "", alignment: AlignmentType.CENTER })] }),
                ]
            }));
        });
        return rows;
    }

    // Header helper (unused mostly due to specific needs)
    private static createHeaderCell(text: string, colSpan = 1, rowSpan = 1, isContinue = false): TableCell {
        return new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })], alignment: AlignmentType.CENTER })],
        });
    }

    // Helper for Type 4, 5, 6 (Simple tables)
    private static createTableType4_5_6(type: string, title: string, colorTheme: string, data: any[]): Table {
        const color = colorTheme === "kuning" ? "FFFF00" : (colorTheme === "hijau" ? "E2EFDA" : "DDEBF7"); // Yellow, Green, Blueish

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, width: { size: 5, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SOAL", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JENIS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, width: { size: 5, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JAWABAN", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: color }, width: { size: 40, type: WidthType.PERCENTAGE } }),
                    ],
                    tableHeader: true
                }),
                ...data.map(d => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(d.no)] }),
                        new TableCell({ children: [new Paragraph(d.question)] }),
                        new TableCell({ children: [new Paragraph({ text: d.type, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph(d.answer)] }),
                    ]
                }))
            ],
            borders: this.getBorders()
        });
    }

    private static getBorders() {
        return {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        };
    }
}
