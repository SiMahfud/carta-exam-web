"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus,
    Filter,
    FileQuestion,
    Trash2,
    Pencil,
    ArrowLeft,
    Tag,
    BarChart3,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MultipleChoiceEditor } from "@/components/question-editor/MultipleChoiceEditor";
import { ComplexMCEditor } from "@/components/question-editor/ComplexMCEditor";
import { ShortAnswerEditor } from "@/components/question-editor/ShortAnswerEditor";
import { MatchingEditor } from "@/components/question-editor/MatchingEditor";
import { EssayEditor } from "@/components/question-editor/EssayEditor";

interface BankQuestion {
    id: string;
    type: string;
    content: any;
    tags: string[];
    difficulty: string;
    defaultPoints: number;
    createdAt: Date;
}

export default function QuestionBankDetailPage() {
    const params = useParams();
    const router = useRouter();
    const bankId = params.id as string;
    const { toast } = useToast();

    const [bank, setBank] = useState<any>(null);
    const [questions, setQuestions] = useState<BankQuestion[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);

    // Filters
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchBankDetails();
        fetchQuestions();
        fetchTags();
    }, [bankId]);

    useEffect(() => {
        fetchQuestions();
    }, [filterType, filterDifficulty, filterTags, page]);

    const fetchBankDetails = async () => {
        try {
            const response = await fetch(`/api/question-banks/${bankId}`);
            if (response.ok) {
                const data = await response.json();
                setBank(data);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch question bank",
                    variant: "destructive",
                });
                router.push("/admin/question-banks");
            }
        } catch (error) {
            console.error("Error fetching bank:", error);
        }
    };

    const fetchQuestions = async () => {
        try {
            let url = `/api/question-banks/${bankId}/questions?page=${page}&limit=20`;
            if (filterType !== "all") url += `&type=${filterType}`;
            if (filterDifficulty !== "all") url += `&difficulty=${filterDifficulty}`;
            if (filterTags.length > 0) url += `&tags=${filterTags.join(",")}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
            toast({
                title: "Error",
                description: "Failed to fetch questions",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch(`/api/question-banks/${bankId}/questions/tags`);
            if (response.ok) {
                const data = await response.json();
                setAvailableTags(data.tags);
            }
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    };

    const handleDelete = async (questionId: string) => {
        if (!confirm("Yakin ingin menghapus soal ini?")) return;

        try {
            const response = await fetch(
                `/api/question-banks/${bankId}/questions/${questionId}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Question deleted successfully",
                });
                fetchQuestions();
                fetchTags();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete question",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting question:", error);
        }
    };

    const handleEdit = (question: BankQuestion) => {
        setEditingQuestion(question);
        setSelectedType(question.type);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Uraian",
        };
        return labels[type] || type;
    };

    const getDifficultyColor = (difficulty: string) => {
        const colors: Record<string, string> = {
            easy: "bg-green-100 text-green-800",
            medium: "bg-yellow-100 text-yellow-800",
            hard: "bg-red-100 text-red-800",
        };
        return colors[difficulty] || "";
    };

    if (!bank) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/question-banks">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Bank Soal
                    </Button>
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">{bank.name}</h1>
                        <p className="text-muted-foreground mt-2">
                            {bank.description || "No description"}
                        </p>
                    </div>
                    <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah Soal
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Pilih Tipe Soal</DialogTitle>
                                <DialogDescription>
                                    Pilih jenis soal yang ingin dibuat
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-2">
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedType("mc");
                                        setTypeDialogOpen(false);
                                    }}
                                >
                                    <FileQuestion className="mr-2 h-4 w-4" />
                                    Pilihan Ganda
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedType("complex_mc");
                                        setTypeDialogOpen(false);
                                    }}
                                >
                                    <FileQuestion className="mr-2 h-4 w-4" />
                                    Pilihan Ganda Kompleks
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedType("matching");
                                        setTypeDialogOpen(false);
                                    }}
                                >
                                    <FileQuestion className="mr-2 h-4 w-4" />
                                    Menjodohkan
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedType("short");
                                        setTypeDialogOpen(false);
                                    }}
                                >
                                    <FileQuestion className="mr-2 h-4 w-4" />
                                    Isian Singkat
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedType("essay");
                                        setTypeDialogOpen(false);
                                    }}
                                >
                                    <FileQuestion className="mr-2 h-4 w-4" />
                                    Uraian
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">Total</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.total || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">PG</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.mc || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">PG Kompleks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">
                            {bank.statistics?.complex_mc || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">Menjodohkan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.matching || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">Isian</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.short || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">Uraian</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.essay || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Soal
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Tipe Soal</Label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tipe</SelectItem>
                                    <SelectItem value="mc">Pilihan Ganda</SelectItem>
                                    <SelectItem value="complex_mc">PG Kompleks</SelectItem>
                                    <SelectItem value="matching">Menjodohkan</SelectItem>
                                    <SelectItem value="short">Isian Singkat</SelectItem>
                                    <SelectItem value="essay">Uraian</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tingkat Kesulitan</Label>
                            <Select
                                value={filterDifficulty}
                                onValueChange={setFilterDifficulty}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tingkat</SelectItem>
                                    <SelectItem value="easy">Mudah</SelectItem>
                                    <SelectItem value="medium">Sedang</SelectItem>
                                    <SelectItem value="hard">Sulit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tag</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {availableTags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant={
                                            filterTags.includes(tag) ? "default" : "outline"
                                        }
                                        className="cursor-pointer"
                                        onClick={() => {
                                            if (filterTags.includes(tag)) {
                                                setFilterTags(filterTags.filter((t) => t !== tag));
                                            } else {
                                                setFilterTags([...filterTags, tag]);
                                            }
                                        }}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                                {availableTags.length === 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        Belum ada tag
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Questions List */}
            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : questions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            Belum ada soal. Tambahkan soal pertama!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {questions.map((question, index) => (
                        <Card key={question.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary">
                                                #{(page - 1) * 20 + index + 1}
                                            </Badge>
                                            <Badge>{getTypeLabel(question.type)}</Badge>
                                            <Badge
                                                className={getDifficultyColor(
                                                    question.difficulty
                                                )}
                                            >
                                                {question.difficulty}
                                            </Badge>
                                            <Badge variant="outline">
                                                {question.defaultPoints} poin
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-base">
                                            {question.content?.question ||
                                                "No question text"}
                                        </CardTitle>
                                        {question.tags && question.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {question.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        <Tag className="h-3 w-3 mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(question)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(question.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="py-2 px-4">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* All Question Editors */}
            <MultipleChoiceEditor
                open={selectedType === "mc"}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedType("");
                        setEditingQuestion(null);
                    }
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                questionToEdit={editingQuestion || undefined}
            />
            <ComplexMCEditor
                open={selectedType === "complex_mc"}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedType("");
                        setEditingQuestion(null);
                    }
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                questionToEdit={editingQuestion || undefined}
            />
            <ShortAnswerEditor
                open={selectedType === "short"}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedType("");
                        setEditingQuestion(null);
                    }
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                questionToEdit={editingQuestion || undefined}
            />
            <MatchingEditor
                open={selectedType === "matching"}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedType("");
                        setEditingQuestion(null);
                    }
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                questionToEdit={editingQuestion || undefined}
            />
            <EssayEditor
                open={selectedType === "essay"}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedType("");
                        setEditingQuestion(null);
                    }
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                questionToEdit={editingQuestion || undefined}
            />
        </div>
    );
}
