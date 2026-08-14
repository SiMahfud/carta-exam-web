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
                    return {
                        id: q.id,
                        type: q.type,
                        questionText: parsedContent.question || "",
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
        return <div className="p-8 text-center text-sm">Menyiapkan format dokumen cetak...</div>;
    }

    if (!template) {
        return <div className="p-8 text-center text-sm text-destructive">Template ujian tidak ditemukan.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-6 px-4 print:p-0 print:bg-white">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden bg-card p-4 rounded-xl border shadow-sm">
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
            <div className="max-w-4xl mx-auto bg-white text-black p-8 sm:p-12 rounded-lg shadow-xl print:shadow-none print:p-0 print:max-w-full font-serif">
                {/* School Header Kop */}
                <div className="border-b-4 border-double border-black pb-4 mb-6 text-center space-y-1">
                    <h2 className="text-sm font-bold tracking-widest uppercase">Pemerintah Provinsi Jawa Timur</h2>
                    <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide">
                        SMA Negeri 1 Campurdarat
                    </h1>
                    <p className="text-xs font-sans text-slate-600">
                        Jl. Raya Campurdarat, Telp. (0355) 531xxx, Tulungagung - Jawa Timur
                    </p>
                    <div className="pt-2 text-sm font-bold uppercase tracking-wider underline">
                        {mode === "exam" && `NASKAH SOAL: ${template.name}`}
                        {mode === "ljk" && `LEMBAR JAWABAN KOMPUTER (LJK): ${template.name}`}
                        {mode === "key" && `KUNCI JAWABAN & PANDUAN GURU: ${template.name}`}
                    </div>
                </div>

                {/* Meta info table */}
                <div className="grid grid-cols-2 text-xs font-sans mb-6 pb-3 border-b border-black gap-y-1">
                    <div><strong>Mata Pelajaran:</strong> {template.subjectName}</div>
                    <div><strong>Alokasi Waktu:</strong> {template.durationMinutes} Menit</div>
                    <div><strong>Jumlah Soal:</strong> {questions.length} Butir</div>
                    <div><strong>KKM / Kelulusan:</strong> {template.passingScore}</div>
                </div>

                {/* 1. Mode Naskah Soal */}
                {mode === "exam" && (
                    <div className="space-y-6">
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded text-[11px] font-sans">
                            <strong>Petunjuk Umum:</strong>
                            <ol className="list-decimal list-inside mt-1 space-y-0.5">
                                <li>Bacalah doa sebelum mengerjakan ujian.</li>
                                <li>Periksa dan bacalah setiap butir soal dengan seksama sebelum menjawab.</li>
                                <li>Gunakan pulpen hitam / pensil 2B untuk mengisi jawaban pada lembar jawaban yang disediakan.</li>
                            </ol>
                        </div>

                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="space-y-2 text-sm break-inside-avoid">
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold">{idx + 1}.</span>
                                        <div className="flex-1 font-normal leading-relaxed">
                                            <MathHtmlRenderer html={q.questionText} />
                                        </div>
                                    </div>

                                    {/* MC Options */}
                                    {(q.type === "mc" || q.type === "true_false") && q.content?.options && (
                                        <div className="ml-6 space-y-1.5 pt-1">
                                            {q.content.options.map((opt: any, optIdx: number) => {
                                                const label = String.fromCharCode(65 + optIdx);
                                                const optText = typeof opt === "string" ? opt : opt.text || "";
                                                return (
                                                    <div key={label} className="flex items-start gap-2 text-xs">
                                                        <span className="font-semibold">{label}.</span>
                                                        <MathHtmlRenderer html={optText} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Essay Answer Space */}
                                    {q.type === "essay" && (
                                        <div className="ml-6 mt-3 h-24 border border-dashed border-slate-300 rounded p-2 text-xs text-slate-400 font-sans">
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
                    <div className="space-y-6 font-sans">
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

                        {/* Bubble grid */}
                        <div className="border border-black p-4 rounded">
                            <h4 className="text-xs font-bold text-center mb-4 uppercase tracking-wider">
                                Lembar Jawaban Pilihan Ganda
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                                {Array.from({ length: Math.min(questions.length || 40, 50) }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className="w-6 font-bold text-right text-[11px]">{i + 1}.</span>
                                        {["A", "B", "C", "D", "E"].map((opt) => (
                                            <div
                                                key={opt}
                                                className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold"
                                            >
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Mode Kunci Jawaban Guru */}
                {mode === "key" && (
                    <div className="space-y-4 font-sans text-xs">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded font-bold text-blue-900">
                            Dokumen Rahasia Guru / Pengawas - Kunci Jawaban dan Pembobotan
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {questions.map((q, idx) => {
                                let keyLabel = "-";
                                if (q.type === "mc") {
                                    const correctIndex = Number(q.answerKey?.correct ?? 0);
                                    keyLabel = String.fromCharCode(65 + correctIndex);
                                } else if (q.type === "true_false") {
                                    keyLabel = q.answerKey?.correct ? "BENAR" : "SALAH";
                                } else if (q.type === "short") {
                                    keyLabel = Array.isArray(q.answerKey?.acceptedAnswers)
                                        ? q.answerKey.acceptedAnswers.join(", ")
                                        : "-";
                                } else if (q.type === "essay") {
                                    keyLabel = q.answerKey?.modelAnswer || "Sesuai Rubrik";
                                }

                                return (
                                    <div key={q.id} className="p-2 border rounded bg-slate-50 flex justify-between items-center">
                                        <span><strong>No. {idx + 1}</strong> ({q.type})</span>
                                        <Badge className="font-bold font-mono">{keyLabel}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
