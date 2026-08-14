import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Sparkles, Loader2, ThumbsUp, AlertCircle } from "lucide-react";
import { MatchingResultViewer } from "@/components/exam/MatchingResultViewer";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { safeJsonParse } from "@/lib/json-utils";
import { evaluateEssayWithAI, AIGradingResult } from "@/actions/ai-grading";
import { useToast } from "@/hooks/use-toast";

export interface GradingAnswer {
    answerId: string;
    questionId: string;
    type: string;
    questionText: string;
    questionContent: any;
    studentAnswer: any;
    correctAnswer: any;
    isFlagged: boolean;
    isCorrect: boolean;
    score: number;
    maxPoints: number;
    partialPoints: number;
    gradingStatus: string;
    gradingNotes: string | null;
    defaultPoints: number;
}

interface GradingItemCardProps {
    answer: GradingAnswer;
    index: number;
    grade: { score: number; comment: string };
    onGradeChange: (answerId: string, score: number, comment: string) => void;
}

export function GradingItemCard({
    answer,
    index,
    grade,
    onGradeChange,
}: GradingItemCardProps) {
    const { toast } = useToast();
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<AIGradingResult | null>(null);

    const handleAIEvaluation = async () => {
        setAiLoading(true);
        try {
            const guidelines = (answer.questionContent as any)?.guidelines;
            const rubric = (answer.questionContent as any)?.rubric;
            const modelAnswer = (answer.questionContent as any)?.modelAnswer;

            const res = await evaluateEssayWithAI({
                questionText: answer.questionText,
                studentAnswer: typeof answer.studentAnswer === 'string' ? answer.studentAnswer : JSON.stringify(answer.studentAnswer || ""),
                maxPoints: answer.maxPoints || answer.defaultPoints || 10,
                guidelines,
                rubric,
                modelAnswer,
            });

            if (!res.success) {
                toast({
                    title: "Gagal Mengambil Saran AI",
                    description: res.error || "Terjadi kesalahan saat memproses jawaban siswa dengan AI.",
                    variant: "destructive",
                });
            } else {
                setAiResult(res);
                toast({
                    title: "✨ Saran Nilai AI Tersedia",
                    description: `Rekomendasi nilai: ${res.suggestedScore} / ${answer.maxPoints}`,
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Gagal memanggil AI.",
                variant: "destructive",
            });
        } finally {
            setAiLoading(false);
        }
    };

    const applyAISuggestion = () => {
        if (!aiResult || aiResult.suggestedScore === undefined) return;
        onGradeChange(
            answer.answerId,
            aiResult.suggestedScore,
            aiResult.feedback || grade.comment
        );
        toast({
            title: "Saran Diterapkan",
            description: "Nilai dan komentar telah diperbarui dari saran AI.",
        });
    };

    const renderAnswerContent = () => {
        if (answer.type === "essay") {
            const guidelines = (answer.questionContent as any)?.guidelines;
            const rubric = (answer.questionContent as any)?.rubric || [];

            return (
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Jawaban Siswa:</h4>
                        <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                            {typeof answer.studentAnswer === 'string' ? (
                                <MathHtmlRenderer html={answer.studentAnswer} />
                            ) : (
                                answer.studentAnswer || <span className="text-muted-foreground italic">Tidak ada jawaban</span>
                            )}
                        </div>
                    </div>

                    {guidelines && (
                        <div>
                            <h4 className="font-semibold mb-2">Panduan Penilaian:</h4>
                            <p className="text-sm text-muted-foreground">{guidelines}</p>
                        </div>
                    )}

                    {rubric.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Rubrik:</h4>
                            <div className="space-y-2">
                                {rubric.map((r: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 text-sm">
                                        <Badge variant="outline">{r.points} poin</Badge>
                                        <span>{r.criteria}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Grading Suggestion Box */}
                    {aiResult && (
                        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/70 dark:bg-purple-950/20 dark:border-purple-900/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-semibold text-sm">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <span>Rekomendasi Penilaian AI</span>
                                    <Badge className="bg-purple-600 font-mono text-xs">
                                        {aiResult.suggestedScore} / {answer.maxPoints} poin
                                    </Badge>
                                </div>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={applyAISuggestion}
                                    className="bg-purple-600 hover:bg-purple-700 text-xs h-7"
                                >
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    Terapkan ke Nilai
                                </Button>
                            </div>
                            {aiResult.feedback && (
                                <p className="text-xs text-purple-950 dark:text-purple-200/90 leading-relaxed bg-white/60 dark:bg-slate-900/50 p-2.5 rounded border border-purple-100 dark:border-purple-900/30">
                                    {aiResult.feedback}
                                </p>
                            )}
                            {(aiResult.strengths && aiResult.strengths.length > 0) || (aiResult.improvements && aiResult.improvements.length > 0) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                                    {aiResult.strengths && aiResult.strengths.length > 0 && (
                                        <div className="space-y-1">
                                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                <Check className="h-3 w-3" /> Kelebihan:
                                            </span>
                                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                                {aiResult.strengths.map((s, idx) => (
                                                    <li key={idx}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {aiResult.improvements && aiResult.improvements.length > 0 && (
                                        <div className="space-y-1">
                                            <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" /> Perlu Ditingkatkan:
                                            </span>
                                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                                {aiResult.improvements.map((s, idx) => (
                                                    <li key={idx}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">
                                    Nilai (Max: {answer.maxPoints})
                                </label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={handleAIEvaluation}
                                    disabled={aiLoading}
                                    className="text-xs h-7 px-2.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40 flex items-center gap-1.5"
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Menganalisis...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                            <span>✨ Nilai dengan AI</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <Input
                                type="number"
                                min="0"
                                max={answer.maxPoints}
                                value={grade.score}
                                onChange={(e) => onGradeChange(
                                    answer.answerId,
                                    parseFloat(e.target.value) || 0,
                                    grade.comment
                                )}
                                className="w-full"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Komentar (Opsional)</label>
                            <Textarea
                                value={grade.comment}
                                onChange={(e) => onGradeChange(
                                    answer.answerId,
                                    grade.score,
                                    e.target.value
                                )}
                                placeholder="Berikan feedback untuk siswa..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        if (answer.type === "matching") {
            const leftItems = (answer.questionContent as any)?.leftItems || [];
            const rightItems = (answer.questionContent as any)?.rightItems || [];

            const leftIdToIndex: Record<string, number> = {};
            const rightIdToIndex: Record<string, number> = {};
            leftItems.forEach((item: any, idx: number) => {
                const id = typeof item === 'object' ? item.id : item;
                leftIdToIndex[id] = idx;
            });
            rightItems.forEach((item: any, idx: number) => {
                const id = typeof item === 'object' ? item.id : item;
                rightIdToIndex[id] = idx;
            });

            let studentPairs: any[] = [];
            if (Array.isArray(answer.studentAnswer)) {
                studentPairs = answer.studentAnswer.map((pair: any) => {
                    const leftKey = pair.left || pair.leftId;
                    const rightKey = pair.right || pair.rightId;
                    return {
                        left: typeof leftKey === 'string' && leftIdToIndex[leftKey] !== undefined ? leftIdToIndex[leftKey] : (parseInt(leftKey) || 0),
                        right: typeof rightKey === 'string' && rightIdToIndex[rightKey] !== undefined ? rightIdToIndex[rightKey] : (parseInt(rightKey) || 0),
                    };
                });
            }

            const parsedKey = safeJsonParse(answer.correctAnswer, {});
            const correctPairsIndexed: Record<number, number> = {};

            if (parsedKey.matches && Array.isArray(parsedKey.matches)) {
                parsedKey.matches.forEach((match: any) => {
                    const leftIdx = leftIdToIndex[match.leftId];
                    const rightIdx = rightIdToIndex[match.rightId];
                    if (leftIdx !== undefined && rightIdx !== undefined) {
                        correctPairsIndexed[leftIdx] = rightIdx;
                    }
                });
            } else if (parsedKey.pairs) {
                Object.entries(parsedKey.pairs).forEach(([k, v]: [string, any]) => {
                    correctPairsIndexed[parseInt(k)] = Array.isArray(v) ? v[0] : v;
                });
            }

            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        {answer.isCorrect ? (
                            <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                        ) : (
                            <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                        )}
                        <span className="text-sm">
                            Poin: {answer.partialPoints}/{answer.maxPoints}
                        </span>
                    </div>

                    <MatchingResultViewer
                        question={{
                            id: answer.questionId,
                            questionText: answer.questionText,
                            leftItems,
                            rightItems
                        }}
                        studentPairs={studentPairs}
                        correctPairs={correctPairsIndexed}
                    />

                    <details className="text-xs text-muted-foreground cursor-pointer">
                        <summary>Lihat Kunci Jawaban (Teks)</summary>
                        <div className="mt-2 p-2 bg-muted/20 rounded border">
                            {Object.entries(correctPairsIndexed).map(([left, right]: [string, any], idx) => {
                                const rightIndices = Array.isArray(right) ? right : [right];
                                const leftItem = leftItems[parseInt(left)];
                                const leftText = typeof leftItem === 'object' ? leftItem?.text : leftItem;
                                return rightIndices.map((rIndex: number, rIdx: number) => {
                                    const rightItem = rightItems[rIndex];
                                    const rightText = typeof rightItem === 'object' ? rightItem?.text : rightItem;
                                    return (
                                        <div key={`${idx}-${rIdx}`} className="flex gap-2 py-1">
                                            <div className="font-medium"><MathHtmlRenderer html={leftText} /></div>
                                            <span>→</span>
                                            <div><MathHtmlRenderer html={rightText} /></div>
                                        </div>
                                    );
                                });
                            })}
                        </div>
                    </details>
                </div>
            );
        }

        if (answer.type === "complex_mc") {
            const selectedOptions = Array.isArray(answer.studentAnswer) ? answer.studentAnswer : [];
            const parsedCorrect = safeJsonParse(answer.correctAnswer, []);
            const correctOptions = Array.isArray(parsedCorrect)
                ? parsedCorrect
                : (parsedCorrect as any)?.correctOptions || (parsedCorrect as any)?.correctIndices || [];
            const options = (answer.questionContent as any)?.options || [];

            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        {answer.isCorrect ? (
                            <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                        ) : (
                            <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                        )}
                        <span className="text-sm">
                            Poin: {answer.partialPoints}/{answer.maxPoints}
                        </span>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 border-b grid grid-cols-[1fr,100px,100px] gap-4 text-sm font-medium">
                            <div>Opsi Jawaban</div>
                            <div className="text-center">Pilihan Siswa</div>
                            <div className="text-center">Kunci</div>
                        </div>
                        <div className="divide-y">
                            {options.map((opt: any, idx: number) => {
                                const isString = typeof opt === 'string';
                                const label = isString ? String.fromCharCode(65 + idx) : (opt.label || String.fromCharCode(65 + idx));
                                const text = isString ? opt : (opt.text || opt.html || "");

                                const isSelected = selectedOptions.includes(label);
                                const isCorrect = correctOptions.includes(label) || correctOptions.includes(idx) || correctOptions.includes(String(idx));
                                let rowClass = "";

                                if (isSelected && isCorrect) rowClass = "bg-green-50 dark:bg-green-900/20";
                                else if (isSelected && !isCorrect) rowClass = "bg-red-50 dark:bg-red-900/20";
                                else if (!isSelected && isCorrect) rowClass = "bg-yellow-50 dark:bg-yellow-900/20";

                                return (
                                    <div key={label} className={`px-4 py-3 grid grid-cols-[1fr,100px,100px] gap-4 text-sm items-center ${rowClass}`}>
                                        <div>
                                            <span className="font-semibold mr-2">{label}.</span>
                                            <MathHtmlRenderer html={text} className="inline-block" />
                                        </div>
                                        <div className="flex justify-center">
                                            {isSelected && (
                                                <div className="h-5 w-5 rounded bg-primary text-primary-foreground flex items-center justify-center">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-center">
                                            {isCorrect && <Check className="h-5 w-5 text-green-600" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        if (answer.type === "mc") {
            const options = (answer.questionContent as any)?.options || [];

            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        {answer.isCorrect ? (
                            <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                        ) : (
                            <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                        )}
                        <span className="text-sm">
                            Poin: {answer.partialPoints}/{answer.maxPoints}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {options.map((opt: any, idx: number) => {
                            const isString = typeof opt === 'string';
                            const label = isString ? String.fromCharCode(65 + idx) : (opt.label || String.fromCharCode(65 + idx));
                            const text = isString ? opt : (opt.text || opt.html || "");

                            const isSelected = answer.studentAnswer === label;
                            const isCorrect = answer.correctAnswer === label;
                            let borderClass = "border-muted";
                            let bgClass = "bg-background";

                            if (isSelected && isCorrect) {
                                borderClass = "border-green-500";
                                bgClass = "bg-green-50 dark:bg-green-900/20";
                            } else if (isSelected && !isCorrect) {
                                borderClass = "border-red-500";
                                bgClass = "bg-red-50 dark:bg-red-900/20";
                            } else if (isCorrect) {
                                borderClass = "border-green-500";
                                bgClass = "bg-green-50/50 dark:bg-green-900/10";
                            }

                            return (
                                <div key={label} className={`flex items-start gap-3 p-3 rounded-lg border-2 ${borderClass} ${bgClass}`}>
                                    <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 
                                         ${isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground text-muted-foreground"}`}>
                                        {label}
                                    </div>
                                    <div className="flex-1">
                                        <MathHtmlRenderer html={text} />
                                    </div>
                                    {isSelected && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary">Dijawab</span>
                                    )}
                                    {isCorrect && (
                                        <Check className="h-4 w-4 text-green-600" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Fallback for short answers
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {answer.isCorrect ? (
                        <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                    ) : (
                        <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                    )}
                    <span className="text-sm">
                        Poin: {answer.partialPoints}/{answer.maxPoints}
                    </span>
                </div>
                <div>
                    <p className="text-sm font-medium mb-1">Jawaban Siswa:</p>
                    <p className="text-sm text-muted-foreground">
                        {typeof answer.studentAnswer === 'object'
                            ? JSON.stringify(answer.studentAnswer)
                            : answer.studentAnswer || "-"}
                    </p>
                </div>
                {answer.type !== "essay" && (
                    <div>
                        <p className="text-sm font-medium mb-1">Jawaban Benar:</p>
                        <p className="text-sm text-green-600">
                            {typeof answer.correctAnswer === 'object'
                                ? JSON.stringify(answer.correctAnswer)
                                : answer.correctAnswer || "-"}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base flex items-center gap-2">
                        <span>No. {index + 1}</span>
                        <Badge variant="outline">
                            {answer.type === "mc" ? "Pilihan Ganda" :
                                answer.type === "complex_mc" ? "Pilihan Ganda Kompleks" :
                                    answer.type === "matching" ? "Menjodohkan" :
                                        answer.type === "short" ? "Jawaban Singkat" :
                                            answer.type === "true_false" ? "Benar/Salah" : "Essay"}
                        </Badge>
                    </CardTitle>
                    <Badge variant={
                        answer.gradingStatus === "completed" ? "default" :
                            answer.gradingStatus === "manual" ? "secondary" : "outline"
                    }>
                        {answer.gradingStatus === "completed" ? "Selesai" :
                            answer.gradingStatus === "manual" ? "Perlu Dinilai" : "Auto"}
                    </Badge>
                </div>
                <div className="mt-2 text-foreground">
                    <MathHtmlRenderer html={answer.questionText} />
                </div>
            </CardHeader>
            <CardContent>
                {renderAnswerContent()}
            </CardContent>
        </Card>
    );
}
