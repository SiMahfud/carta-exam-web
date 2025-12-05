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
import { Eye, RefreshCw, Loader2, Clock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";

interface PreviewQuestion {
    number: number;
    type: string;
    questionText: string;
    options?: { label: string; text: string }[];
    correctAnswer?: any;
    points?: number;
    difficulty?: string;
    pairs?: { left: string; right: string }[];
    leftItems?: (string | { id: string; text: string })[];
    rightItems?: (string | { id: string; text: string })[];
    rawAnswerKey?: any;
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
                                {previewData.questions.map((question) => {
                                    console.log("Rendering question:", question.number, question.type);
                                    console.log("Correct Answer (Raw):", question.correctAnswer, typeof question.correctAnswer);
                                    console.log("Options:", question.options);

                                    return (
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

                                            <div className="text-sm font-medium">
                                                <MathHtmlRenderer html={question.questionText} />
                                            </div>

                                            {/* MC */}
                                            {question.type === 'mc' && question.options && question.options.length > 0 && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Klik salah satu pilihan jawaban</p>
                                                    <div className="space-y-2 pl-4">
                                                        {question.options.map((option: any, idx: number) => {
                                                            let correctLabel = question.correctAnswer;
                                                            // Handle numeric index (0, 1, 2...) or string index ("0", "1"...)
                                                            if (typeof correctLabel === 'number' || !isNaN(Number(correctLabel))) {
                                                                correctLabel = String.fromCharCode(65 + Number(correctLabel));
                                                            }

                                                            const isCorrect = correctLabel === option.label;
                                                            return (
                                                                <div key={option.label} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                    <input type="radio" name={`q${question.number}`} className="mt-0.5" defaultChecked={isCorrect} />
                                                                    <div className="flex gap-2 flex-1">
                                                                        <span className="font-medium min-w-[24px]">{option.label}.</span>
                                                                        <div className="text-sm w-full">
                                                                            <MathHtmlRenderer html={option.text} />
                                                                        </div>
                                                                        {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs whitespace-nowrap">✓ BENAR</span>}
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
                                                                correctLabels = question.correctAnswer.map((ans: any) => {
                                                                    if (typeof ans === 'number' || !isNaN(Number(ans))) {
                                                                        return String.fromCharCode(65 + Number(ans));
                                                                    }
                                                                    return ans;
                                                                });
                                                            }
                                                            const isCorrect = correctLabels.includes(option.label);
                                                            return (
                                                                <div key={option.label} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                    <input type="checkbox" className="mt-0.5" defaultChecked={isCorrect} />
                                                                    <div className="flex gap-2 flex-1">
                                                                        <span className="font-medium min-w-[24px]">{option.label}.</span>
                                                                        <div className="text-sm w-full">
                                                                            <MathHtmlRenderer html={option.text} />
                                                                        </div>
                                                                        {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs whitespace-nowrap">✓ BENAR</span>}
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
                                            {question.type === 'matching' && question.leftItems && question.rightItems && (
                                                <div className="space-y-3 pl-4">
                                                    <p className="text-xs text-blue-600 italic mb-3">💡 Cara menjawab: Pasangkan item kiri dengan item kanan yang sesuai</p>
                                                    <p className="text-sm font-semibold text-gray-700 mb-3">Kunci Jawaban (Pasangan Benar):</p>

                                                    <div className="border rounded-lg p-4 bg-muted/10">
                                                        <MatchingQuestionRenderer
                                                            question={{
                                                                id: `preview-${question.number}`,
                                                                questionText: "", // Already rendered above
                                                                leftItems: question.leftItems,
                                                                rightItems: question.rightItems
                                                            }}
                                                            answer={(() => {
                                                                const { leftItems, rightItems, rawAnswerKey } = question;
                                                                if (!leftItems || !rightItems || !rawAnswerKey) return [];

                                                                const getItemId = (item: any) => typeof item === 'object' ? (item.id || item.text) : item;

                                                                if (rawAnswerKey.matches) {
                                                                    // ID based
                                                                    return rawAnswerKey.matches.map((m: any) => ({ left: m.leftId, right: m.rightId }));
                                                                }

                                                                if (rawAnswerKey.pairs) {
                                                                    // Index based
                                                                    const answers: { left: string; right: string }[] = [];
                                                                    Object.entries(rawAnswerKey.pairs).forEach(([leftIdx, rightIndices]) => {
                                                                        const lItem = leftItems[parseInt(leftIdx)];
                                                                        if (!lItem) return;
                                                                        const lId = getItemId(lItem);

                                                                        const rIndices = Array.isArray(rightIndices) ? rightIndices : [rightIndices];
                                                                        rIndices.forEach((rIdx: any) => {
                                                                            const rItem = rightItems[rIdx as number];
                                                                            if (rItem) {
                                                                                answers.push({ left: lId, right: getItemId(rItem) });
                                                                            }
                                                                        });
                                                                    });
                                                                    return answers;
                                                                }
                                                                return [];
                                                            })()}
                                                            onChange={() => { }} // Read-only
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {question.type === 'matching' && (!question.pairs || question.pairs.length === 0) && (
                                                <div className="border-2 border-dashed rounded p-3 text-sm text-muted-foreground text-center">Tidak ada data menjodohkan</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
