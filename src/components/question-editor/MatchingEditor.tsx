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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag as TagIcon, Trash2, ArrowRight } from "lucide-react";

interface QuestionEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    questionToEdit?: any;
}

export function MatchingEditor({
    open,
    onOpenChange,
    bankId,
    onSuccess,
    availableTags,
    questionToEdit,
}: QuestionEditorProps) {
    const [formData, setFormData] = useState({
        question: "",
        leftItems: ["", "", ""], // Minimum 3 items
        rightItems: ["", "", ""], // Minimum 3 items
        pairs: {} as { [key: number]: number }, // leftIndex -> rightIndex
        difficulty: "medium",
        defaultPoints: 1,
        tags: [] as string[],
    });
    const [newTag, setNewTag] = useState("");

    useEffect(() => {
        if (open) {
            if (questionToEdit) {
                setFormData({
                    question: questionToEdit.content.question,
                    leftItems: questionToEdit.content.leftItems,
                    rightItems: questionToEdit.content.rightItems,
                    pairs: questionToEdit.answerKey.pairs,
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

        // Validate all items have text
        const hasEmptyLeft = formData.leftItems.some(item => !item.trim());
        const hasEmptyRight = formData.rightItems.some(item => !item.trim());

        if (hasEmptyLeft || hasEmptyRight) {
            alert("Semua item harus diisi");
            return;
        }

        // Validate all pairs are defined
        for (let i = 0; i < formData.leftItems.length; i++) {
            if (formData.pairs[i] === undefined) {
                alert(`Pilih pasangan untuk item kiri ${i + 1}`);
                return;
            }
        }

        const content = {
            question: formData.question,
            leftItems: formData.leftItems,
            rightItems: formData.rightItems,
        };

        const answerKey = {
            pairs: formData.pairs,
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
                    type: "matching",
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

    const resetForm = () => {
        setFormData({
            question: "",
            leftItems: ["", "", ""],
            rightItems: ["", "", ""],
            pairs: {},
            difficulty: "medium",
            defaultPoints: 1,
            tags: [],
        });
        setNewTag("");
    };

    const addLeftItem = () => {
        setFormData({
            ...formData,
            leftItems: [...formData.leftItems, ""],
            rightItems: [...formData.rightItems, ""],
        });
    };

    const removeItem = (index: number) => {
        if (formData.leftItems.length > 3) {
            const newLeftItems = formData.leftItems.filter((_, i) => i !== index);
            const newRightItems = formData.rightItems.filter((_, i) => i !== index);

            // Rebuild pairs after removal
            const newPairs: { [key: number]: number } = {};
            Object.keys(formData.pairs).forEach((key) => {
                const oldLeftIndex = parseInt(key);
                const oldRightIndex = formData.pairs[oldLeftIndex];

                // Adjust indices
                if (oldLeftIndex < index) {
                    // Left index stays same, right might shift
                    newPairs[oldLeftIndex] = oldRightIndex > index ? oldRightIndex - 1 : oldRightIndex;
                } else if (oldLeftIndex > index) {
                    // Left index shifts down
                    newPairs[oldLeftIndex - 1] = oldRightIndex > index ? oldRightIndex - 1 : oldRightIndex;
                }
                // Skip if oldLeftIndex === index (removed)
            });

            setFormData({
                ...formData,
                leftItems: newLeftItems,
                rightItems: newRightItems,
                pairs: newPairs,
            });
        }
    };

    const updateLeftItem = (index: number, value: string) => {
        const newLeftItems = [...formData.leftItems];
        newLeftItems[index] = value;
        setFormData({ ...formData, leftItems: newLeftItems });
    };

    const updateRightItem = (index: number, value: string) => {
        const newRightItems = [...formData.rightItems];
        newRightItems[index] = value;
        setFormData({ ...formData, rightItems: newRightItems });
    };

    const setPair = (leftIndex: number, rightIndex: number) => {
        setFormData({
            ...formData,
            pairs: {
                ...formData.pairs,
                [leftIndex]: rightIndex,
            },
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {questionToEdit ? "Edit Soal Menjodohkan" : "Tambah Soal Menjodohkan"}
                    </DialogTitle>
                    <DialogDescription>
                        {questionToEdit ? "Edit detail soal menjodohkan" : "Buat soal menjodohkan dengan pasangan item kiri dan kanan"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Question Text */}
                        <div>
                            <Label htmlFor="question">Pertanyaan *</Label>
                            <Textarea
                                id="question"
                                value={formData.question}
                                onChange={(e) =>
                                    setFormData({ ...formData, question: e.target.value })
                                }
                                required
                                placeholder="Masukkan pertanyaan..."
                                rows={3}
                            />
                        </div>

                        {/* Items and Pairing */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Item yang Dijodohkan *</Label>
                                <Button
                                    type="button"
                                    onClick={addLeftItem}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Pasangan
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {formData.leftItems.map((leftItem, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        {/* Left Item */}
                                        <div className="col-span-5">
                                            <Input
                                                value={leftItem}
                                                onChange={(e) =>
                                                    updateLeftItem(index, e.target.value)
                                                }
                                                placeholder={`Item Kiri ${index + 1}`}
                                                required
                                            />
                                        </div>

                                        {/* Arrow */}
                                        <div className="col-span-1 flex justify-center">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        {/* Pairing Dropdown */}
                                        <div className="col-span-5">
                                            <Select
                                                value={formData.pairs[index]?.toString()}
                                                onValueChange={(value) =>
                                                    setPair(index, parseInt(value))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih pasangan..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.rightItems.map((rightItem, rIndex) => (
                                                        <SelectItem
                                                            key={rIndex}
                                                            value={rIndex.toString()}
                                                        >
                                                            {rightItem || `Item Kanan ${rIndex + 1}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Remove Button */}
                                        <div className="col-span-1">
                                            {formData.leftItems.length > 3 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Minimal 3 pasangan item
                            </p>
                        </div>

                        {/* Right Items (for reference) */}
                        <div>
                            <Label>Item Kanan (akan diacak saat ujian)</Label>
                            <div className="space-y-2 mt-2">
                                {formData.rightItems.map((rightItem, index) => (
                                    <Input
                                        key={index}
                                        value={rightItem}
                                        onChange={(e) =>
                                            updateRightItem(index, e.target.value)
                                        }
                                        placeholder={`Item Kanan ${index + 1}`}
                                        required
                                    />
                                ))}
                            </div>
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
                </form>
            </DialogContent>
        </Dialog>
    );
}
