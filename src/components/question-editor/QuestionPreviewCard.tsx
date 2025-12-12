import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X, Trash2 } from "lucide-react";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

interface QuestionPreviewCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    question: any;
    index: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (updatedQuestion: any) => void;
    onDelete: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QuestionPreviewCard({ question, index, onUpdate, onDelete }: QuestionPreviewCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [edited, setEdited] = useState<any>(null);

    const startEditing = () => {
        setEdited(JSON.parse(JSON.stringify(question))); // Deep copy
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setEdited(null);
        setIsEditing(false);
    };

    const saveEditing = () => {
        if (edited) {
            onUpdate(edited);
        }
        setIsEditing(false);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Uraian/Esai",
            true_false: "Benar / Salah",
        };
        return labels[type] || type;
    };

    // Render Logic Area
    if (isEditing && edited) {
        return (
            <div className="border rounded-lg p-4 space-y-4 bg-card text-card-foreground shadow-sm ring-2 ring-primary/20">
                <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-semibold text-sm">Edit Soal No. {question.metadata.originalNo}</h4>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-1" /> Batal
                        </Button>
                        <Button size="sm" onClick={saveEditing}>
                            <Save className="h-4 w-4 mr-1" /> Simpan
                        </Button>
                    </div>
                </div>

                {/* Common: Question Text */}
                <div className="space-y-2">
                    <Label>Pertanyaan</Label>
                    <RichTextEditor
                        value={edited.content.question}
                        onChange={(val) => setEdited({ ...edited, content: { ...edited.content, question: val } })}
                    />
                </div>

                {/* MC Editor */}
                {edited.type === 'mc' && (
                    <div className="space-y-3">
                        <Label>Opsi Jawaban & Kunci</Label>
                        <RadioGroup
                            value={edited.answerKey?.correct?.toString()}
                            onValueChange={(val) => setEdited({ ...edited, answerKey: { correct: parseInt(val) } })}
                        >
                            {edited.content.options.map((opt: string, i: number) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="pt-3">
                                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`opt-${i}`} className="text-xs font-bold w-4">{["A", "B", "C", "D", "E"][i]}</Label>
                                            <RichTextEditor
                                                value={opt}
                                                onChange={(val) => {
                                                    const newOpts = [...edited.content.options];
                                                    newOpts[i] = val;
                                                    setEdited({ ...edited, content: { ...edited.content, options: newOpts } });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}

                {/* Complex MC Editor */}
                {edited.type === 'complex_mc' && (
                    <div className="space-y-3">
                        <Label>Opsi Jawaban & Kunci (Centang yang benar)</Label>
                        <div className="space-y-4">
                            {edited.content.options.map((opt: string, i: number) => {
                                const isChecked = edited.answerKey.correctIndices.includes(i);
                                return (
                                    <div key={i} className="flex gap-3 items-start">
                                        <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                                let newIndices = [...edited.answerKey.correctIndices];
                                                if (checked) {
                                                    newIndices.push(i);
                                                } else {
                                                    newIndices = newIndices.filter((idx: number) => idx !== i);
                                                }
                                                setEdited({ ...edited, answerKey: { ...edited.answerKey, correctIndices: newIndices } });
                                            }}
                                            className="mt-3"
                                        />
                                        <div className="flex-1">
                                            <RichTextEditor
                                                value={opt}
                                                onChange={(val) => {
                                                    const newOpts = [...edited.content.options];
                                                    newOpts[i] = val;
                                                    setEdited({ ...edited, content: { ...edited.content, options: newOpts } });
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Short Answer Editor */}
                {edited.type === 'short' && (
                    <div className="space-y-3">
                        <Label>Kunci Jawaban (Pisahkan dengan garis baru jika lebih dari satu variasi)</Label>
                        <Textarea
                            value={edited.answerKey.acceptedAnswers?.join('\n') || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const answers = val.split('\n').filter((s: string) => s.trim().length > 0);
                                setEdited({ ...edited, answerKey: { ...edited.answerKey, acceptedAnswers: answers } });
                            }}
                            rows={4}
                            placeholder="Contoh: Merah&#10;Warna Merah"
                        />
                        <p className="text-xs text-muted-foreground">Siswa dianggap benar jika menjawab salah satu dari daftar di atas.</p>
                    </div>
                )}

                {/* Essay Editor */}
                {edited.type === 'essay' && (
                    <div className="space-y-3">
                        <Label>Model Jawaban (Referensi Guru)</Label>
                        <Textarea
                            value={edited.answerKey.modelAnswer || ''}
                            onChange={(e) => {
                                setEdited({ ...edited, answerKey: { ...edited.answerKey, modelAnswer: e.target.value } });
                            }}
                            rows={4}
                        />
                    </div>
                )}

                {/* Matching Editor - Limited Support */}
                {edited.type === 'matching' && (
                    <div className="p-4 bg-muted/20 rounded text-sm text-center">
                        <p>Pengeditan struktur soal menjodohkan belum didukung di inline edit.</p>
                        <p>Silakan edit teks pertanyaan di atas, atau edit struktur setelah import.</p>
                    </div>
                )}
            </div>
        );
    }

    // View Mode (Similar to original ImportQuestionsDialog rendering)
    return (
        <div className="border rounded-lg p-4 space-y-3 bg-card text-card-foreground shadow-sm group hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex gap-2 items-center">
                    <Badge variant="outline">No. {question.metadata.originalNo}</Badge>
                    <Badge variant="secondary">{getTypeLabel(question.type)}</Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={startEditing} title="Edit Soal">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} title="Hapus Soal">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <MathHtmlRenderer
                className="text-sm font-medium"
                html={question.content.question}
            />

            {/* MC Preview */}
            {question.type === 'mc' && (
                <div className="space-y-3">
                    <div className="space-y-2 pl-4">
                        {question.content.options.map((opt: string, i: number) => {
                            const isCorrect = i === question.answerKey.correct;
                            return (
                                <div key={i} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'hover:bg-muted/50'}`}>
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full border border-primary text-[10px] flex-shrink-0 mt-0.5">
                                        {["A", "B", "C", "D", "E"][i]}
                                    </div>
                                    <div className="flex-1">
                                        <MathHtmlRenderer className="text-sm" html={opt} />
                                    </div>
                                    {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ KUNCI</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Complex MC Preview */}
            {question.type === 'complex_mc' && (
                <div className="space-y-3">
                    <div className="space-y-2 pl-4">
                        {question.content.options.map((opt: string, i: number) => {
                            const isCorrect = question.answerKey.correctIndices.includes(i);
                            return (
                                <div key={i} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'hover:bg-muted/50'}`}>
                                    <div className="h-4 w-4 border rounded-sm flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <MathHtmlRenderer className="text-sm" html={opt} />
                                    </div>
                                    {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ KUNCI</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Matching Preview */}
            {question.type === 'matching' && (
                <div className="space-y-3 pl-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Preview Pasangan:</p>
                    <div className="border rounded-lg p-4 bg-muted/10">
                        <MatchingQuestionRenderer
                            question={{
                                id: `import-${index}`,
                                questionText: "",
                                leftItems: question.content.leftItems,
                                rightItems: question.content.rightItems
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            answer={question.answerKey.matches?.map((m: any) => ({
                                left: m.leftId,
                                right: m.rightId
                            })) || []}
                            onChange={() => { }} // Read-only
                        />
                    </div>
                </div>
            )}

            {/* Short / Essay Preview */}
            {(question.type === 'short' || question.type === 'essay') && (
                <div className="space-y-2 pl-4">
                    <div className="p-3 bg-muted/20 border rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Kunci Jawaban:</p>
                        <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                            {question.type === 'short' ? (
                                <span>{question.answerKey.acceptedAnswers?.join(' / ')}</span>
                            ) : (
                                <MathHtmlRenderer html={question.answerKey.modelAnswer || ''} className="whitespace-pre-wrap" />
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* True/False Preview */}
            {question.type === 'true_false' && (
                <div className="space-y-3">
                    <p className="text-xs text-blue-600 italic">💡 Cara menjawab: Pilih Benar atau Salah</p>
                    <div className="space-y-2 pl-4">
                        {["Benar", "Salah"].map((opt, i) => {
                            // question.answerKey.correct: 0 = True, 1 = False
                            // i: 0 = Benar, 1 = Salah
                            const isCorrect = i === question.answerKey.correct;
                            return (
                                <div key={i} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'hover:bg-muted/50'}`}>
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full border border-primary text-[10px] flex-shrink-0 mt-0.5">
                                        {opt === "Benar" ? "B" : "S"}
                                    </div>
                                    <div className="text-sm flex-1 font-medium">
                                        {opt}
                                    </div>
                                    {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ KUNCI</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
