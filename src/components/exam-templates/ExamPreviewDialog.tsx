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
        generatePreview(); // Generate with new seed
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
                        {/* Exam Info */}
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
                                <Badge variant="secondary" className="text-xs">
                                    Soal Diacak
                                </Badge>
                            )}
                        </div>

                        {/* Regenerate Button */}
                        <div className="flex justify-end flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={loading}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Regenerate Preview
                            </Button>
                        </div>

                        {/* Questions - Scrollable */}
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

                                        {/* Options for MC questions */}
                                        {question.options && question.options.length > 0 && (
                                            <div className="space-y-2 pl-4">
                                                {question.options.map((option: any) => (
                                                    <div key={option.label} className="flex items-start gap-2">
                                                        <span className="font-medium min-w-[24px]">{option.label}.</span>
                                                        <span className="text-sm">{option.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Answer box for short/essay */}
                                        {(question.type === 'short' || question.type === 'essay') && (
                                            <div className="border-2 border-dashed rounded p-3 text-sm text-muted-foreground text-center">
                                                {question.type === 'essay'
                                                    ? 'Area jawaban uraian siswa'
                                                    : 'Area jawaban singkat siswa'}
                                            </div>
                                        )}

                                        {/* Matching pairs */}
                                        {question.type === 'matching' && question.pairs && question.pairs.length > 0 && (
                                            <div className="space-y-2 pl-4">
                                                {question.pairs.map((pair, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 text-sm">
                                                        <div className="flex-1 p-2 border rounded bg-muted/20">
                                                            {pair.left}
                                                        </div>
                                                        <span className="text-muted-foreground">→</span>
                                                        <div className="flex-1 p-2 border-2 border-dashed rounded text-muted-foreground text-center">
                                                            Jawaban siswa
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {question.type === 'matching' && (!question.pairs || question.pairs.length === 0) && (
                                            <div className="border-2 border-dashed rounded p-3 text-sm text-muted-foreground text-center">
                                                Area menjodohkan siswa
                                            </div>
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
