"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreviewQuestion {
    number: number;
    type: string;
    questionText: string;
    options?: { label: string; text: string }[];
    correctAnswer?: any;
    points?: number;
    difficulty?: string;
    pairs?: { left: string; right: string }[];
    acceptableAnswers?: string[];
    rubric?: { criterion: string; points: number }[];
    guidelines?: string;
}

interface ExamPreviewData {
    examInfo: {
        name: string;
        durationMinutes: number;
        totalScore: number;
    };
    questions: PreviewQuestion[];
    metadata: {
        totalQuestions: number;
        randomizationApplied: boolean;
        seed: string;
    };
}

interface ExamPreviewDialogProps {
    templateId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ExamPreviewDialog({ templateId, open, onOpenChange }: ExamPreviewDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<ExamPreviewData | null>(null);

    const generatePreview = async (seed?: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/exam-templates/${templateId}/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seed }),
            });

            if (response.ok) {
                const data = await response.json();
                setPreviewData(data);
            } else {
                throw new Error("Failed to generate preview");
            }
        } catch (error) {
            console.error("Error generating preview:", error);
            toast({
                title: "Error",
                description: "Gagal membuat preview ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        generatePreview();
    };

    // Auto-generate preview when dialog opens
    useState(() => {
        if (open && !previewData && !loading) {
            generatePreview();
        }
    });

    const getQuestionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Uraian/Esai",
        };
        return labels[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Preview Ujian
                    </DialogTitle>
                    <DialogDescription>
                        Pratinjau tampilan soal ujian untuk siswa
                    </DialogDescription>
                </DialogHeader>

                {loading && !previewData ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : previewData ? (
                    <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border space-y-2 flex-shrink-0">
                            <h3 className="font-semibold text-lg">{previewData.examInfo.name}</h3>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {previewData.examInfo.durationMinutes} menit
                                </div>
                                <div>Total Skor: {previewData.examInfo.totalScore}</div>
                                <div>Total Soal: {previewData.metadata.totalQuestions}</div>
                            </div>
                            {previewData.metadata.randomizationApplied && (
                                <Badge variant="secondary" className="text-xs">Soal Diacak</Badge>
                            )}
                        </div>

                        <div className="flex justify-end flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Regenerate Preview
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="space-y-6">
                                {previewData.questions.map((question) => (
                                    <div key={question.number} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center">
                                                <Badge variant="outline">No. {question.number}</Badge>
                                                <Badge variant="secondary">{getQuestionTypeLabel(question.type)}</Badge>
                                            </div>
                                            {question.points && (
                                                <span className="text-sm text-muted-foreground">
                                                    {question.points} poin
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm font-medium">{question.questionText}</div>

                                        {/* MC */}
                                        {question.type === 'mc' && question.options && question.options.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Klik salah satu pilihan jawaban</p>
                                                <div className="space-y-2 pl-4">
                                                    {question.options.map((option: any, idx: number) => {
                                                        const correctLabel = typeof question.correctAnswer === 'number'
                                                            ? String.fromCharCode(65 + question.correctAnswer)
                                                            : question.correctAnswer;
                                                        const isCorrect = correctLabel === option.label;
                                                        return (
                                                            <div key={option.label} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                <input type="radio" name={`q${question.number}`} className="mt-0.5" defaultChecked={isCorrect} />
                                                                <div className="flex gap-2 flex-1">
                                                                    <span className="font-medium min-w-[24px]">{option.label}.</span>
                                                                    <span className="text-sm">{option.text}</span>
                                                                    {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ BENAR</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Complex MC */}
                                        {question.type === 'complex_mc' && question.options && question.options.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Centang satu atau lebih pilihan jawaban yang benar</p>
                                                <div className="space-y-2 pl-4">
                                                    {question.options.map((option: any, idx: number) => {
                                                        let correctLabels: string[] = [];
                                                        if (Array.isArray(question.correctAnswer)) {
                                                            correctLabels = question.correctAnswer.map((ans: any) =>
                                                                typeof ans === 'number' ? String.fromCharCode(65 + ans) : ans
                                                            );
                                                        }
                                                        const isCorrect = correctLabels.includes(option.label);
                                                        return (
                                                            <div key={option.label} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                <input type="checkbox" className="mt-0.5" defaultChecked={isCorrect} />
                                                                <div className="flex gap-2 flex-1">
                                                                    <span className="font-medium min-w-[24px]">{option.label}.</span>
                                                                    <span className="text-sm">{option.text}</span>
                                                                    {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ BENAR</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Short */}
                                        {question.type === 'short' && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Ketik jawaban singkat Anda pada kotak di bawah</p>
                                                <input type="text" value={question.acceptableAnswers && question.acceptableAnswers.length > 0 ? question.acceptableAnswers.join(' / ') : ''} placeholder="Ketik jawaban Anda di sini..." className="w-full p-3 border rounded-lg bg-green-50 text-green-800 font-semibold" disabled readOnly />
                                                {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
                                                    <p className="text-xs text-green-700 italic">🔑 Jawaban yang ditampilkan di atas adalah kunci jawaban</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Essay */}
                                        {question.type === 'essay' && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Tulis jawaban uraian Anda dengan lengkap dan jelas</p>
                                                <textarea placeholder="Tulis jawaban uraian Anda di sini..." rows={6} className="w-full p-3 border rounded-lg resize-none" disabled />
                                                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                                                    <p className="text-xs font-semibold text-blue-800 mb-1">Panduan Penilaian:</p>
                                                    <p className="text-xs text-blue-700">{question.guidelines || 'Jawab dengan lengkap dan jelas'}</p>
                                                    {question.rubric && question.rubric.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-semibold text-blue-800 mb-1">Rubrik:</p>
                                                            {question.rubric.map((r: any, idx: number) => (
                                                                <div key={idx} className="text-xs text-blue-700">• {r.criterion} ({r.points} poin)</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Matching */}
                                        {question.type === 'matching' && question.pairs && question.pairs.length > 0 && (
                                            <div className="space-y-3 pl-4">
                                                <p className="text-xs text-blue-600 italic mb-3">💡 Cara menjawab: Klik item di kolom kiri, kemudian klik pasangannya di kolom kanan</p>
                                                <p className="text-sm font-semibold text-gray-700 mb-3">Jawaban (dengan garis penghubung):</p>
                                                <div className="relative">
                                                    <div className="grid grid-cols-2 gap-8 relative z-10">
                                                        <div className="space-y-2">
                                                            {question.pairs.map((pair: any, idx: number) => {
                                                                const colors = ['bg-blue-100 border-blue-400', 'bg-purple-100 border-purple-400', 'bg-pink-100 border-pink-400', 'bg-yellow-100 border-yellow-400', 'bg-cyan-100 border-cyan-400'];
                                                                return (
                                                                    <div key={`left-${idx}`} className={`p-3 border-2 rounded-lg text-sm ${colors[idx % colors.length]} cursor-pointer hover:shadow-md transition-shadow`}>{pair.left}</div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {question.pairs.map((pair: any, idx: number) => {
                                                                const colors = ['bg-blue-100 border-blue-400', 'bg-purple-100 border-purple-400', 'bg-pink-100 border-pink-400', 'bg-yellow-100 border-yellow-400', 'bg-cyan-100 border-cyan-400'];
                                                                return (
                                                                    <div key={`right-${idx}`} className={`p-3 border-2 rounded-lg text-sm ${colors[idx % colors.length]} cursor-pointer hover:shadow-md transition-shadow`}>{pair.right}</div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                                                        {question.pairs.map((_: any, idx: number) => {
                                                            const lineColors = ['#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4'];
                                                            const leftY = idx * 52 + 26;
                                                            const rightY = idx * 52 + 26;
                                                            return (
                                                                <line key={`line-${idx}`} x1="48%" y1={leftY} x2="52%" y2={rightY} stroke={lineColors[idx % lineColors.length]} strokeWidth="3" strokeDasharray="5,5" />
                                                            );
                                                        })}
                                                    </svg>
                                                </div>
                                                <p className="text-xs text-muted-foreground italic mt-3">* Pasangan dengan warna dan garis yang sama adalah jawaban yang benar</p>
                                            </div>
                                        )}

                                        {question.type === 'matching' && (!question.pairs || question.pairs.length === 0) && (
                                            <div className="border-2 border-dashed rounded p-3 text-sm text-muted-foreground text-center">Tidak ada data menjodohkan</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
