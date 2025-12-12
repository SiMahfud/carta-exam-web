"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag as TagIcon, Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuestionEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questionToEdit?: any;
}

export function EssayEditor({
    open,
    onOpenChange,
    bankId,
    onSuccess,
    availableTags,
    questionToEdit,
}: QuestionEditorProps) {
    const [formData, setFormData] = useState({
        question: "",
        guidelines: "",
        maxWords: null as number | null,
        rubric: [{ criteria: "", maxPoints: 1 }], // At least one criterion
        keywords: [] as string[],
        difficulty: "medium",
        defaultPoints: 1,
        tags: [] as string[],
    });
    const [newTag, setNewTag] = useState("");
    const [newKeyword, setNewKeyword] = useState("");
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);


    useEffect(() => {
        if (open) {
            if (questionToEdit) {
                setFormData({
                    question: questionToEdit.content.question,
                    guidelines: questionToEdit.content.guidelines || "",
                    maxWords: questionToEdit.content.maxWords || null,
                    rubric: questionToEdit.answerKey.rubric || [{ criteria: "", maxPoints: 1 }],
                    keywords: questionToEdit.answerKey.keywords || [],
                    difficulty: questionToEdit.difficulty,
                    defaultPoints: questionToEdit.defaultPoints,
                    tags: questionToEdit.tags || [],
                });
            } else {
                resetForm();
            }
        }
    }, [open, questionToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate rubric
        const hasEmptyCriteria = formData.rubric.some(r => !r.criteria.trim());
        if (hasEmptyCriteria) {
            alert("Semua kriteria rubrik harus diisi");
            return;
        }

        // Calculate total rubric points
        const totalRubricPoints = formData.rubric.reduce((sum, r) => sum + r.maxPoints, 0);

        // Warn if default points doesn't match rubric total
        if (formData.defaultPoints !== totalRubricPoints) {
            setWarningDialogOpen(true);
            return;
        }

        // Submit if validation passes
        await submitForm();
    };

    const submitForm = async () => {
        const content = {
            question: formData.question,
            guidelines: formData.guidelines || undefined,
            maxWords: formData.maxWords || undefined,
        };

        const answerKey = {
            rubric: formData.rubric,
            keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
        };

        try {
            const url = questionToEdit
                ? `/api/question-banks/${bankId}/questions/${questionToEdit.id}`
                : `/api/question-banks/${bankId}/questions`;

            const method = questionToEdit ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "essay",
                    content,
                    answerKey,
                    tags: formData.tags,
                    difficulty: formData.difficulty,
                    defaultPoints: formData.defaultPoints,
                }),
            });

            if (response.ok) {
                resetForm();
                onSuccess();
                onOpenChange(false);
            } else {
                alert("Failed to save question");
            }
        } catch (error) {
            console.error("Error saving question:", error);
            alert("Failed to save question");
        }
    };

    const handleWarningConfirm = async () => {
        setWarningDialogOpen(false);
        await submitForm();
    };

    const resetForm = () => {
        setFormData({
            question: "",
            guidelines: "",
            maxWords: null,
            rubric: [{ criteria: "", maxPoints: 1 }],
            keywords: [],
            difficulty: "medium",
            defaultPoints: 1,
            tags: [],
        });
        setNewTag("");
        setNewKeyword("");
    };

    const addRubricItem = () => {
        setFormData({
            ...formData,
            rubric: [...formData.rubric, { criteria: "", maxPoints: 1 }],
        });
    };

    const updateRubricCriteria = (index: number, criteria: string) => {
        const newRubric = [...formData.rubric];
        newRubric[index].criteria = criteria;
        setFormData({ ...formData, rubric: newRubric });
    };

    const updateRubricPoints = (index: number, points: number) => {
        const newRubric = [...formData.rubric];
        newRubric[index].maxPoints = points;
        setFormData({ ...formData, rubric: newRubric });
    };

    const removeRubricItem = (index: number) => {
        if (formData.rubric.length > 1) {
            const newRubric = formData.rubric.filter((_, i) => i !== index);
            setFormData({ ...formData, rubric: newRubric });
        }
    };

    const addKeyword = () => {
        if (newKeyword && !formData.keywords.includes(newKeyword)) {
            setFormData({
                ...formData,
                keywords: [...formData.keywords, newKeyword],
            });
            setNewKeyword("");
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData({
            ...formData,
            keywords: formData.keywords.filter((k) => k !== keyword),
        });
    };

    const addTag = () => {
        if (newTag && !formData.tags.includes(newTag)) {
            setFormData({ ...formData, tags: [...formData.tags, newTag] });
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((t) => t !== tag),
        });
    };

    const addExistingTag = (tag: string) => {
        if (!formData.tags.includes(tag)) {
            setFormData({ ...formData, tags: [...formData.tags, tag] });
        }
    };

    const getTotalRubricPoints = () => {
        return (formData.rubric || []).reduce((sum, r) => sum + r.maxPoints, 0);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {questionToEdit ? "Edit Soal Uraian" : "Tambah Soal Uraian"}
                    </DialogTitle>
                    <DialogDescription>
                        {questionToEdit ? "Edit detail soal uraian" : "Buat soal uraian dengan rubrik penilaian"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Question Text */}
                        <div>
                            <Label htmlFor="question">Pertanyaan *</Label>
                            <RichTextEditor
                                value={formData.question}
                                onChange={(value) =>
                                    setFormData({ ...formData, question: value })
                                }
                                placeholder="Masukkan pertanyaan..."
                            />
                        </div>

                        {/* Guidelines */}
                        <div>
                            <Label htmlFor="guidelines">Panduan Jawaban (Opsional)</Label>
                            <Textarea
                                id="guidelines"
                                value={formData.guidelines}
                                onChange={(e) =>
                                    setFormData({ ...formData, guidelines: e.target.value })
                                }
                                placeholder="Berikan panduan atau petunjuk untuk siswa..."
                                rows={2}
                            />
                        </div>

                        {/* Max Words */}
                        <div>
                            <Label htmlFor="maxWords">Batas Kata Maksimal (Opsional)</Label>
                            <Input
                                id="maxWords"
                                type="number"
                                min="1"
                                value={formData.maxWords || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        maxWords: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                }
                                placeholder="Kosongkan jika tidak ada batasan"
                            />
                        </div>

                        {/* Rubric */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>
                                    Rubrik Penilaian *
                                    <span className="text-sm text-muted-foreground ml-2">
                                        (Total: {getTotalRubricPoints()} poin)
                                    </span>
                                </Label>
                                <Button
                                    type="button"
                                    onClick={addRubricItem}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Kriteria
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formData.rubric.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-start border p-3 rounded">
                                        <div className="flex-1">
                                            <Input
                                                value={item.criteria}
                                                onChange={(e) =>
                                                    updateRubricCriteria(index, e.target.value)
                                                }
                                                placeholder={`Kriteria ${index + 1}`}
                                                required
                                                className="mb-2"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">Poin Max:</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.maxPoints}
                                                    onChange={(e) =>
                                                        updateRubricPoints(
                                                            index,
                                                            parseInt(e.target.value) || 1
                                                        )
                                                    }
                                                    className="w-20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        {formData.rubric.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeRubricItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Keywords */}
                        <div>
                            <Label>Kata Kunci (Opsional)</Label>
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    placeholder="Tambah kata kunci..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addKeyword();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addKeyword} variant="outline">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {formData.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.keywords.map((keyword) => (
                                        <Badge key={keyword} variant="secondary">
                                            {keyword}
                                            <X
                                                className="h-3 w-3 ml-1 cursor-pointer"
                                                onClick={() => removeKeyword(keyword)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Difficulty and Points */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, difficulty: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Mudah</SelectItem>
                                        <SelectItem value="medium">Sedang</SelectItem>
                                        <SelectItem value="hard">Sulit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="points">Poin Default</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    min="1"
                                    value={formData.defaultPoints}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            defaultPoints: parseInt(e.target.value),
                                        })
                                    }
                                    required
                                />
                                {formData.defaultPoints !== getTotalRubricPoints() && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Berbeda dari total rubrik ({getTotalRubricPoints()})
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Tambah tag baru..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addTag} variant="outline">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.tags.map((tag) => (
                                        <Badge key={tag} className="cursor-pointer">
                                            <TagIcon className="h-3 w-3 mr-1" />
                                            {tag}
                                            <X
                                                className="h-3 w-3 ml-1"
                                                onClick={() => removeTag(tag)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {availableTags.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Tag yang tersedia:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags
                                            .filter((tag) => !formData.tags.includes(tag))
                                            .map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                    onClick={() => addExistingTag(tag)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="submit">{questionToEdit ? "Simpan Perubahan" : "Simpan Soal"}</Button>
                    </DialogFooter>
                </form >
            </DialogContent >

            {/* Warning Dialog for Points Mismatch */}
            <AlertDialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Poin Tidak Sesuai</AlertDialogTitle>
                        <AlertDialogDescription>
                            Poin default ({formData.defaultPoints}) tidak sama dengan total rubrik ({getTotalRubricPoints()}).
                            Apakah Anda yakin ingin melanjutkan?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleWarningConfirm}>
                            Lanjutkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog >
    );
}
