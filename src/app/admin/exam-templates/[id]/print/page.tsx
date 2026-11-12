"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, FileText, CheckCircle2, LayoutTemplate } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { safeJsonParse } from "@/lib/json-utils";
import { useToast } from "@/hooks/use-toast";

interface QuestionItem {
    id: string;
    type: string;
    questionText: string;
    content: any;
    points: number;
    answerKey: any;
}

interface TemplateData {
    id: string;
    name: string;
    subjectName: string;
    durationMinutes: number;
    totalScore: number;
    passingScore: number;
    description: string | null;
}

// Helper to extract option text whether it's a string or an object with text/option/content
function getOptionText(opt: unknown): string {
    if (typeof opt === "string") return opt;
    if (opt && typeof opt === "object") {
        const o = opt as Record<string, unknown>;
        return String(o.text ?? o.option ?? o.content ?? "");
    }
    return String(opt ?? "");
}

// Helper to extract text from matching items (can be string or { id, text })
function getMatchingItemText(item: unknown): string {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "text" in item) {
        return (item as { text: string }).text;
    }
    return String(item ?? "");
}

// Helper to extract ID from matching items
function getMatchingItemId(item: unknown): string {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if ("id" in obj && obj.id !== undefined && obj.id !== null) return String(obj.id);
        if ("text" in obj) return String(obj.text);
    }
    return String(item ?? "");
}

// Helper to resolve pairs for a matching question
function resolveMatchingPairs(q: QuestionItem) {
    const leftItems: any[] = Array.isArray(q.content?.leftItems)
        ? q.content.leftItems
        : safeJsonParse(q.content?.leftItems, []);
    const rightItems: any[] = Array.isArray(q.content?.rightItems)
        ? q.content.rightItems
        : safeJsonParse(q.content?.rightItems, []);
    const answerKey = q.answerKey || {};

    const pairsResult: { leftNum: number; leftText: string; rightLetter: string; rightText: string }[] = [];

    const findRightIndex = (target: any): number => {
        if (target === undefined || target === null) return -1;
        if (typeof target === "number" && target >= 0 && target < rightItems.length) {
            return target;
        }
        const str = String(target);
        if (/^\d+$/.test(str)) {
            const idx = parseInt(str, 10);
            if (idx >= 0 && idx < rightItems.length) return idx;
        }
        const byId = rightItems.findIndex((r) => String(getMatchingItemId(r)) === str);
        if (byId !== -1) return byId;
        const byText = rightItems.findIndex(
            (r) => getMatchingItemText(r).trim().toLowerCase() === str.trim().toLowerCase()
        );
        return byText;
    };

    leftItems.forEach((leftItem, lIdx) => {
        const leftId = getMatchingItemId(leftItem);
        const leftText = getMatchingItemText(leftItem);
        let matchedRightValues: any[] = [];

        if (Array.isArray(answerKey.matches)) {
            const matches = answerKey.matches.filter(
                (m: any) =>
                    String(m.leftId ?? m.left ?? "") === String(leftId) ||
                    String(m.leftId ?? m.left ?? "") === String(lIdx)
            );
            matchedRightValues = matches.map((m: any) => m.rightId ?? m.right);
        } else if (answerKey.pairs && typeof answerKey.pairs === "object") {
            const raw = answerKey.pairs[leftId] ?? answerKey.pairs[lIdx.toString()] ?? answerKey.pairs[lIdx];
            if (raw !== undefined) {
                matchedRightValues = Array.isArray(raw) ? raw : [raw];
            }
        }

        matchedRightValues.forEach((rVal) => {
            const rIdx = findRightIndex(rVal);
            if (rIdx !== -1 && rIdx < rightItems.length) {
                const rightLetter = String.fromCharCode(65 + rIdx);
                const rightText = getMatchingItemText(rightItems[rIdx]);
                pairsResult.push({
                    leftNum: lIdx + 1,
                    leftText,
                    rightLetter,
                    rightText,
                });
            }
        });
    });

    return pairsResult;
}

interface ResolvedKey {
    label: string;
    details?: string[];
    typeLabel: string;
}

// Helper to resolve the correct answer key for all question types
function resolveQuestionKey(q: QuestionItem): ResolvedKey {
    const { type, answerKey, content } = q;
    let label = "-";
    let details: string[] | undefined = undefined;
    let typeLabel = type;

    switch (type) {
        case "mc": {
            typeLabel = "Pilihan Ganda";
            const val = answerKey?.correct ?? answerKey?.correctAnswer;
            if (typeof val === "number") {
                label = String.fromCharCode(65 + val);
            } else if (typeof val === "string") {
                if (/^\d+$/.test(val)) {
                    label = String.fromCharCode(65 + parseInt(val, 10));
                } else {
                    label = val.toUpperCase();
                }
            }
            break;
        }

        case "complex_mc": {
            typeLabel = "PG Kompleks";
            let rawList: any[] = [];
            if (Array.isArray(answerKey?.correctIndices)) {
                rawList = answerKey.correctIndices;
            } else if (Array.isArray(answerKey?.correct)) {
                rawList = answerKey.correct;
            } else if (Array.isArray(answerKey?.correctAnswer)) {
                rawList = answerKey.correctAnswer;
            } else if (typeof answerKey?.correct === "string") {
                try {
                    const parsed = JSON.parse(answerKey.correct);
                    if (Array.isArray(parsed)) rawList = parsed;
                    else rawList = [answerKey.correct];
                } catch {
                    rawList = [answerKey.correct];
                }
            }

            if (rawList.length > 0) {
                const labels = rawList.map((item: any) => {
                    if (typeof item === "number") return String.fromCharCode(65 + item);
                    if (typeof item === "string") {
                        if (/^\d+$/.test(item)) return String.fromCharCode(65 + parseInt(item, 10));
                        return item.toUpperCase();
                    }
                    return String(item);
                });
                label = Array.from(new Set(labels)).sort().join(", ");
            }
            break;
        }

        case "matching": {
            typeLabel = "Menjodohkan";
            const pairs = resolveMatchingPairs(q);
            if (pairs.length > 0) {
                label = pairs.map((p) => `${p.leftNum}→${p.rightLetter}`).join(", ");
                details = pairs.map(
                    (p) => `${p.leftNum}. ${p.leftText} ➔ ${p.rightLetter}. ${p.rightText}`
                );
            }
            break;
        }

        case "true_false": {
            typeLabel = "Benar/Salah";
            const val = answerKey?.correct;
            if (val === 0 || val === "0" || val === true || val === "true" || val === "Benar") {
                label = "BENAR";
            } else if (val === 1 || val === "1" || val === false || val === "false" || val === "Salah") {
                label = "SALAH";
            } else {
                label = "-";
            }
            break;
        }

        case "short": {
            typeLabel = "Isian Singkat";
            const accepted = answerKey?.acceptedAnswers || content?.acceptableAnswers || answerKey?.correct;
            if (Array.isArray(accepted) && accepted.length > 0) {
                label = accepted.join(" / ");
                details = accepted.map((a: any) => String(a));
            } else if (typeof accepted === "string" && accepted.trim()) {
                label = accepted.trim();
            }
            break;
        }

        case "essay": {
            typeLabel = "Uraian";
            label = answerKey?.modelAnswer ? "Ada Model Jawaban" : "Pedoman Rubrik";
            if (Array.isArray(answerKey?.rubric) && answerKey.rubric.length > 0) {
                details = answerKey.rubric.map(
                    (r: any) => `${r.criteria || r.criterion || "Kriteria"}: maks ${r.maxPoints || r.points || 0} poin`
                );
            } else if (answerKey?.modelAnswer) {
                details = [`Model Jawaban: ${answerKey.modelAnswer}`];
            }
            break;
        }

        default:
            typeLabel = type;
            label = "-";
    }

    return { label, details, typeLabel };
}

export default function PrintableExamPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const templateId = params.id as string;

    const [template, setTemplate] = useState<TemplateData | null>(null);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<"exam" | "ljk" | "key">("exam");

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const res = await fetch(`/api/exam-templates/${templateId}/preview`);
                if (!res.ok) throw new Error("Gagal memuat template ujian");
                const data = await res.json();

                setTemplate({
                    id: data.template.id,
                    name: data.template.name,
                    subjectName: data.template.subjectName || "Semua Mapel",
                    durationMinutes: data.template.durationMinutes || 90,
                    totalScore: data.template.totalScore || 100,
                    passingScore: data.template.passingScore || 75,
                    description: data.template.description,
                });

                const formattedQuestions: QuestionItem[] = (data.questions || []).map((q: any) => {
                    const parsedContent: any = safeJsonParse(q.content, {});
                    const parsedKey: any = safeJsonParse(q.answerKey, {});

                    // Normalize sub-arrays if stringified
                    if (typeof parsedContent.options === "string") {
                        parsedContent.options = safeJsonParse(parsedContent.options, []);
                    }
                    if (typeof parsedContent.leftItems === "string") {
                        parsedContent.leftItems = safeJsonParse(parsedContent.leftItems, []);
                    }
                    if (typeof parsedContent.rightItems === "string") {
                        parsedContent.rightItems = safeJsonParse(parsedContent.rightItems, []);
                    }
                    if (typeof parsedKey.pairs === "string") {
                        parsedKey.pairs = safeJsonParse(parsedKey.pairs, {});
                    }
                    if (typeof parsedKey.matches === "string") {
                        parsedKey.matches = safeJsonParse(parsedKey.matches, []);
                    }
                    if (typeof parsedKey.correct === "string") {
                        const parsed = safeJsonParse(parsedKey.correct, null);
                        if (parsed !== null && (Array.isArray(parsed) || typeof parsed === "object")) {
                            parsedKey.correct = parsed;
                        }
                    }

                    return {
                        id: q.id,
                        type: q.type,
                        questionText: parsedContent.question || parsedContent.questionText || "",
                        content: parsedContent,
                        points: q.points || q.defaultPoints || 1,
                        answerKey: parsedKey,
                    };
                });

                setQuestions(formattedQuestions);
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message || "Gagal memuat data cetak.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (templateId) {
            fetchPreview();
        }
    }, [templateId, toast]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="p-8 text-center text-sm font-sans">Menyiapkan format dokumen cetak...</div>;
    }

    if (!template) {
        return <div className="p-8 text-center text-sm text-destructive font-sans">Template ujian tidak ditemukan.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-6 px-4 print:p-0 print:bg-white">
            {/* Print-specific styles to normalize rich text formatting and optimize layout */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        size: A4;
                        margin: 12mm 15mm 12mm 15mm;
                    }
                    .print-doc {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        font-size: 11pt !important;
                        background: white !important;
                        color: black !important;
                    }
                    .print-doc a {
                        color: black !important;
                        text-decoration: none !important;
                    }
                    .print-doc a:after, .print-doc a[href]:after {
                        content: none !important;
                    }
                    .print-doc .prose a, .print-doc .prose a:hover {
                        color: black !important;
                        text-decoration: none !important;
                        font-weight: inherit !important;
                    }
                    .print-doc .prose, .print-doc .prose * {
                        color: black !important;
                    }
                    .print-doc .bg-slate-50 {
                        background-color: white !important;
                    }
                    .print-doc .text-slate-600 {
                        color: #333 !important;
                    }
                    * {
                        overflow: visible !important;
                    }
                    .print-doc {
                        overflow: visible !important;
                    }
                    .print-doc .prose p {
                        margin: 0 !important;
                    }
                    .print-doc .prose {
                        line-height: 1.4 !important;
                    }
                    .print-doc img {
                        max-width: 100% !important;
                        height: auto !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .question-block {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 0.75rem !important;
                    }
                }
                .print-doc .prose a {
                    color: inherit !important;
                    text-decoration: none !important;
                    font-weight: inherit !important;
                }
                .print-doc .prose p {
                    margin: 0 !important;
                }
            `}} />

            {/* Top Toolbar (Hidden on Print) */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden no-print bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Kembali
                    </Button>
                    <div className="flex bg-muted rounded-lg p-1 border">
                        <Button
                            size="sm"
                            variant={mode === "exam" ? "default" : "ghost"}
                            onClick={() => setMode("exam")}
                            className="text-xs h-7"
                        >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Naskah Soal
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === "ljk" ? "default" : "ghost"}
                            onClick={() => setMode("ljk")}
                            className="text-xs h-7"
                        >
                            <LayoutTemplate className="h-3.5 w-3.5 mr-1" />
                            Lembar Jawaban (LJK)
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === "key" ? "default" : "ghost"}
                            onClick={() => setMode("key")}
                            className="text-xs h-7"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Kunci Jawaban Guru
                        </Button>
                    </div>
                </div>
                <Button onClick={handlePrint} className="bg-primary text-primary-foreground shadow-md gap-2">
                    <Printer className="h-4 w-4" />
                    Cetak Dokumen
                </Button>
            </div>

            {/* Document Container */}
            <div className="print-doc max-w-4xl mx-auto bg-white text-black p-8 sm:p-12 rounded-lg shadow-xl print:shadow-none print:p-0 print:max-w-full font-serif overflow-visible">
                {/* School Header Kop */}
                <div className="border-b-4 border-double border-black pb-3 mb-4 text-center space-y-0.5">
                    <h2 className="text-xs font-bold tracking-widest uppercase">Pemerintah Provinsi Jawa Timur</h2>
                    <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide">
                        SMA Negeri 1 Campurdarat
                    </h1>
                    <p className="text-[10px] font-sans text-slate-600">
                        Jl. Raya Campurdarat, Telp. (0355) 531xxx, Tulungagung - Jawa Timur
                    </p>
                    <div className="pt-1.5 text-xs font-bold uppercase tracking-wider underline">
                        {mode === "exam" && `NASKAH SOAL: ${template.name}`}
                        {mode === "ljk" && `LEMBAR JAWABAN (LJK): ${template.name}`}
                        {mode === "key" && `KUNCI JAWABAN & PEDOMAN GURU: ${template.name}`}
                    </div>
                </div>

                {/* Meta info table */}
                <div className="grid grid-cols-2 text-[10px] font-sans mb-4 pb-2 border-b border-black gap-y-0.5">
                    <div><strong>Mata Pelajaran:</strong> {template.subjectName}</div>
                    <div><strong>Alokasi Waktu:</strong> {template.durationMinutes} Menit</div>
                    <div><strong>Jumlah Soal:</strong> {questions.length} Butir</div>
                    <div><strong>KKM / Kelulusan:</strong> {template.passingScore}</div>
                </div>

                {/* 1. Mode Naskah Soal */}
                {mode === "exam" && (
                    <div className="space-y-3">
                        <div className="p-2 bg-slate-50 border border-slate-300 rounded text-[10px] font-sans">
                            <strong>Petunjuk Umum:</strong>
                            <ol className="list-decimal list-inside mt-0.5 space-y-0">
                                <li>Bacalah doa sebelum mengerjakan ujian.</li>
                                <li>Periksa dan bacalah setiap butir soal dengan seksama sebelum menjawab.</li>
                                <li>Gunakan pulpen hitam / pensil 2B untuk mengisi jawaban pada lembar jawaban yang disediakan.</li>
                            </ol>
                        </div>

                        <div className="space-y-3">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="question-block space-y-1 text-xs break-inside-avoid page-break-inside-avoid">
                                    <div className="flex items-start gap-1.5">
                                        <span className="font-bold min-w-[1.75rem] text-right shrink-0">{idx + 1}.</span>
                                        <div className="flex-1 font-normal leading-snug">
                                            <MathHtmlRenderer html={q.questionText} />
                                        </div>
                                    </div>

                                    {/* 1. Multiple Choice (mc) & True/False (true_false) */}
                                    {(q.type === "mc" || q.type === "true_false") && q.content?.options && (
                                        <div className="ml-7 space-y-0.5 pt-0.5">
                                            {q.content.options.map((opt: any, optIdx: number) => {
                                                const label = String.fromCharCode(65 + optIdx);
                                                const optText = getOptionText(opt);
                                                return (
                                                    <div key={label} className="flex items-start gap-1.5 text-[11px] leading-snug py-[1px]">
                                                        <span className="font-semibold shrink-0">{label}.</span>
                                                        <div className="flex-1">
                                                            <MathHtmlRenderer html={optText} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 2. Pilihan Ganda Kompleks (complex_mc) */}
                                    {q.type === "complex_mc" && q.content?.options && (
                                        <div className="ml-7 space-y-0.5 pt-0.5">
                                            {q.content.options.map((opt: any, optIdx: number) => {
                                                const label = String.fromCharCode(65 + optIdx);
                                                const optText = getOptionText(opt);
                                                return (
                                                    <div key={label} className="flex items-start gap-1.5 text-[11px] leading-snug py-[1px]">
                                                        <span className="font-semibold inline-flex items-center gap-1.5 shrink-0">
                                                            <span className="inline-block w-3.5 h-3.5 border border-black rounded-[2px] shrink-0" />
                                                            <span>{label}.</span>
                                                        </span>
                                                        <div className="flex-1">
                                                            <MathHtmlRenderer html={optText} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 3. Menjodohkan (matching) */}
                                    {q.type === "matching" && (
                                        <div className="ml-7 mt-1.5 mb-2">
                                            <div className="border border-black rounded overflow-hidden text-[11px] max-w-2xl">
                                                <div className="grid grid-cols-2 bg-slate-100 print:bg-slate-100 border-b border-black font-bold text-center divide-x divide-black py-1">
                                                    <div>Kolom A (Pernyataan)</div>
                                                    <div>Kolom B (Pilihan Pasangan)</div>
                                                </div>
                                                <div className="grid grid-cols-2 divide-x divide-black">
                                                    <div className="p-2 space-y-1.5">
                                                        {(q.content?.leftItems || []).map((item: any, lIdx: number) => (
                                                            <div key={lIdx} className="flex items-start gap-1.5">
                                                                <span className="font-semibold shrink-0">{lIdx + 1}.</span>
                                                                <div className="flex-1">
                                                                    <MathHtmlRenderer html={getMatchingItemText(item)} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 space-y-1.5">
                                                        {(q.content?.rightItems || []).map((item: any, rIdx: number) => {
                                                            const label = String.fromCharCode(65 + rIdx);
                                                            return (
                                                                <div key={rIdx} className="flex items-start gap-1.5">
                                                                    <span className="font-semibold shrink-0">{label}.</span>
                                                                    <div className="flex-1">
                                                                        <MathHtmlRenderer html={getMatchingItemText(item)} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Answer blank line for students */}
                                            {(q.content?.leftItems || []).length > 0 && (
                                                <div className="mt-1.5 text-[11px] font-sans flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    <span className="font-semibold text-slate-700">Pasangan Jawaban:</span>
                                                    {(q.content?.leftItems || []).map((_: any, lIdx: number) => (
                                                        <span key={lIdx} className="font-mono">
                                                            {lIdx + 1} - [ &nbsp;&nbsp;&nbsp;&nbsp; ]
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. Isian Singkat (short) */}
                                    {q.type === "short" && (
                                        <div className="ml-7 mt-1.5 flex items-center gap-2 text-[11px] text-slate-600 font-sans">
                                            <span className="font-semibold">Jawaban:</span>
                                            <div className="border-b border-dotted border-black w-64 h-5"></div>
                                        </div>
                                    )}

                                    {/* 5. Uraian / Essay (essay) */}
                                    {q.type === "essay" && (
                                        <div className="ml-7 mt-2 h-24 border border-dashed border-slate-300 rounded p-2 text-xs text-slate-400 font-sans">
                                            [ Lembar Jawab Uraian / Jawaban Siswa ]
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Mode Lembar Jawaban (LJK) */}
                {mode === "ljk" && (
                    <div className="space-y-5 font-sans">
                        {/* Student Info Box */}
                        <div className="border border-black p-4 rounded grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-3">
                                <div>
                                    <label className="block font-bold mb-1">NAMA SISWA:</label>
                                    <div className="h-8 border-b-2 border-dotted border-black"></div>
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">NOMOR PESERTA:</label>
                                    <div className="h-8 border-b-2 border-dotted border-black"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block font-bold mb-1">KELAS / RUANG:</label>
                                    <div className="h-8 border-b-2 border-dotted border-black"></div>
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">TANDA TANGAN:</label>
                                    <div className="h-8 border-b-2 border-dotted border-black"></div>
                                </div>
                            </div>
                        </div>

                        {/* Answers Sheet for Questions */}
                        <div className="border border-black p-4 rounded space-y-4">
                            <h4 className="text-xs font-bold text-center uppercase tracking-wider border-b pb-2">
                                Lembar Jawaban Siswa
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                                {questions.map((q, idx) => {
                                    if (q.type === "mc") {
                                        return (
                                            <div key={q.id} className="flex items-center gap-1.5 p-1 border-b border-slate-200">
                                                <span className="w-7 font-bold text-right text-[11px] shrink-0">{idx + 1}.</span>
                                                <div className="flex gap-1">
                                                    {["A", "B", "C", "D", "E"].map((opt) => (
                                                        <div
                                                            key={opt}
                                                            className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold"
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (q.type === "true_false") {
                                        return (
                                            <div key={q.id} className="flex items-center gap-1.5 p-1 border-b border-slate-200">
                                                <span className="w-7 font-bold text-right text-[11px] shrink-0">{idx + 1}.</span>
                                                <div className="flex gap-1.5">
                                                    <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold">
                                                        B
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold">
                                                        S
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (q.type === "complex_mc") {
                                        return (
                                            <div key={q.id} className="flex items-center gap-1.5 p-1 border-b border-slate-200">
                                                <span className="w-7 font-bold text-right text-[11px] shrink-0">{idx + 1}.</span>
                                                <div className="flex gap-1 items-center">
                                                    {["A", "B", "C", "D", "E"].map((opt) => (
                                                        <div
                                                            key={opt}
                                                            className="w-5 h-5 rounded-[2px] border border-black flex items-center justify-center text-[10px] font-bold"
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                    <span className="text-[9px] font-sans text-slate-500 ml-1">[PGK]</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (q.type === "matching") {
                                        const leftCount = (q.content?.leftItems || []).length || 3;
                                        return (
                                            <div key={q.id} className="p-1 border-b border-slate-200 col-span-1 sm:col-span-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-7 font-bold text-right text-[11px] shrink-0">{idx + 1}.</span>
                                                    <span className="text-[10px] font-sans font-semibold mr-1">Menjodohkan:</span>
                                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                                        {Array.from({ length: leftCount }).map((_, lIdx) => (
                                                            <span key={lIdx} className="font-mono">
                                                                {lIdx + 1}:[ &nbsp;&nbsp; ]
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (q.type === "short") {
                                        return (
                                            <div key={q.id} className="p-1 border-b border-slate-200 col-span-1 sm:col-span-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-7 font-bold text-right text-[11px] shrink-0">{idx + 1}.</span>
                                                    <span className="text-[10px] font-sans mr-1">Isian:</span>
                                                    <div className="border-b border-black flex-1 h-4"></div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (q.type === "essay") {
                                        return (
                                            <div key={q.id} className="p-1 border-b border-slate-200 col-span-full">
                                                <span className="font-bold text-[11px]">No. {idx + 1} (Uraian):</span>
                                                <div className="h-16 border border-dotted border-black mt-1 rounded p-1 text-[10px] text-slate-400">
                                                    [ Ruang Jawaban Uraian ]
                                                </div>
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Mode Kunci Jawaban Guru */}
                {mode === "key" && (
                    <div className="space-y-5 font-sans text-xs">
                        {/* Notice & Meta Summary */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-sm">Dokumen Rahasia Guru / Pengawas</h3>
                                <p className="text-[11px] text-blue-700">Kunci Jawaban, Bobot Poin, dan Pedoman Penskoran</p>
                            </div>
                            <div className="text-right text-[11px]">
                                <div>Total Soal: <strong>{questions.length} Butir</strong></div>
                                <div>Total Poin: <strong>{template.totalScore} Poin</strong></div>
                            </div>
                        </div>

                        {/* Quick Answer Key Grid */}
                        <div className="border border-black rounded p-3">
                            <h4 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-1.5 mb-3">
                                Ringkasan Kunci Jawaban
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {questions.map((q, idx) => {
                                    const { label, typeLabel } = resolveQuestionKey(q);

                                    return (
                                        <div
                                            key={q.id}
                                            className="p-2 border border-slate-300 rounded bg-slate-50 flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-[11px] flex items-center gap-1">
                                                    <span>No. {idx + 1}</span>
                                                    <span className="text-[9px] font-normal text-slate-500">
                                                        ({typeLabel})
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500">{q.points} Poin</div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="font-bold font-mono text-[11px] bg-white border-black text-black shrink-0 px-2 py-0.5 max-w-[120px] truncate"
                                                title={label}
                                            >
                                                {label}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detailed Rubric & Pair Mapping Section (for Matching, Essay, and Short Answer) */}
                        {questions.some(
                            (q) => q.type === "matching" || q.type === "essay" || q.type === "short"
                        ) && (
                            <div className="border border-black rounded p-3 space-y-3">
                                <h4 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-1.5">
                                    Pedoman Penskoran & Detail Jawaban (Menjodohkan, Isian & Uraian)
                                </h4>

                                <div className="space-y-3">
                                    {questions.map((q, idx) => {
                                        if (q.type !== "matching" && q.type !== "essay" && q.type !== "short") {
                                            return null;
                                        }

                                        const { label, details, typeLabel } = resolveQuestionKey(q);

                                        return (
                                            <div
                                                key={q.id}
                                                className="p-2.5 border rounded bg-slate-50 text-[11px] space-y-1.5 question-block"
                                            >
                                                <div className="flex justify-between items-start font-bold border-b pb-1">
                                                    <div>
                                                        <span>No. {idx + 1} - {typeLabel}</span>
                                                        <span className="font-normal text-slate-600 ml-2">
                                                            (Bobot: {q.points} Poin)
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs bg-white px-2 py-0.5 border rounded">
                                                        {label}
                                                    </span>
                                                </div>

                                                {/* Question Text preview */}
                                                <div className="text-slate-700 italic">
                                                    <MathHtmlRenderer html={q.questionText} />
                                                </div>

                                                {/* Detailed pairs or criteria list */}
                                                {details && details.length > 0 && (
                                                    <div className="pt-1">
                                                        <div className="font-semibold text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                                                            {q.type === "matching"
                                                                ? "Pasangan Benar:"
                                                                : q.type === "short"
                                                                ? "Variasi Jawaban Diterima:"
                                                                : "Pedoman Penilaian / Rubrik:"}
                                                        </div>
                                                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                                            {details.map((item, dIdx) => (
                                                                <li key={dIdx} className="leading-snug">
                                                                    <MathHtmlRenderer html={item} />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
