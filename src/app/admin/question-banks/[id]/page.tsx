"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,

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

import { Label } from "@/components/ui/label";
import {
    Plus,
    Filter,
    FileQuestion,
    ArrowLeft,
    Pencil,
    Eye,
    Loader2,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QuestionEditorHost } from "@/components/question-editor/QuestionEditorHost";
import { BankQuestionCard, BankQuestion } from "@/components/question-editor/BankQuestionCard";
import { ImportQuestionsDialog } from "@/components/question-editor/ImportQuestionsDialog";
import { GenerateQuestionsDialog } from "@/components/question-editor/GenerateQuestionsDialog";

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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    // Edit Bank Info State
    const [editBankDialogOpen, setEditBankDialogOpen] = useState(false);
    const [bankFormData, setBankFormData] = useState({
        name: "",
        description: "",
        subjectId: "",
    });
    const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
    const [isSavingBank, setIsSavingBank] = useState(false);

    // Preview Dialog State
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);



    const fetchBankDetails = useCallback(async () => {
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
    }, [bankId, router, toast]);

    const fetchQuestions = useCallback(async () => {
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
    }, [bankId, page, filterType, filterDifficulty, filterTags, toast]);

    const fetchTags = useCallback(async () => {
        try {
            const response = await fetch(`/api/question-banks/${bankId}/questions/tags`);
            if (response.ok) {
                const data = await response.json();
                setAvailableTags(data.tags);
            }
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    }, [bankId]);

    const fetchSubjects = useCallback(async () => {
        try {
            const response = await fetch("/api/subjects");
            if (response.ok) {
                const result = await response.json();
                setSubjects(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    }, []);

    useEffect(() => {
        fetchBankDetails();
        fetchQuestions();
        fetchTags();
        fetchSubjects();
    }, [bankId, fetchBankDetails, fetchQuestions, fetchTags, fetchSubjects]);

    useEffect(() => {
        fetchQuestions();
    }, [filterType, filterDifficulty, filterTags, page, fetchQuestions]);

    const handleOpenEditBank = () => {
        if (!bank) return;
        setBankFormData({
            name: bank.name || "",
            description: bank.description || "",
            subjectId: bank.subjectId || "",
        });
        setEditBankDialogOpen(true);
    };

    const handleSaveBank = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSavingBank(true);
            const response = await fetch(`/api/question-banks/${bankId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bankFormData),
            });

            if (response.ok) {
                const updated = await response.json();
                setBank((prev: any) => ({
                    ...prev,
                    ...updated,
                }));
                toast({
                    title: "Berhasil",
                    description: "Informasi bank soal berhasil diperbarui",
                });
                setEditBankDialogOpen(false);
            } else {
                const error = await response.json();
                toast({
                    title: "Gagal",
                    description: error.error || "Gagal memperbarui bank soal",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating bank:", error);
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat memperbarui bank soal",
                variant: "destructive",
            });
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleDeleteClick = (questionId: string) => {
        console.log("Delete button clicked for question:", questionId);
        setQuestionToDelete(questionId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!questionToDelete) return;

        console.log("Deleting question:", questionToDelete);
        try {
            const response = await fetch(
                `/api/question-banks/${bankId}/questions/${questionToDelete}`,
                { method: "DELETE" }
            );

            console.log("Delete response:", response.status);

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Soal berhasil dihapus",
                });
                fetchBankDetails();
                fetchQuestions();
                fetchTags();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Delete failed:", errorData);
                toast({
                    title: "Error",
                    description: errorData.error || "Gagal menghapus soal",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting question:", error);
            toast({
                title: "Error",
                description: "Terjadi error saat menghapus soal",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setQuestionToDelete(null);
        }
    };

    const handleEdit = (question: BankQuestion) => {
        setEditingQuestion(question);
        setSelectedType(question.type);
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
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">{bank.name}</h1>
                            {bank.canEdit !== false && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={handleOpenEditBank}
                                    title="Edit / Rename Bank Soal"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {bank.subjectName && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    {bank.subjectName}
                                </Badge>
                            )}
                            <p className="text-muted-foreground text-sm">
                                {bank.description || "Tidak ada deskripsi"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewDialogOpen(true)}
                            disabled={questions.length === 0}
                            title="Lihat pratinjau tampilan soal"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Pratinjau Soal
                        </Button>
                        <ImportQuestionsDialog
                            bankId={bankId}
                            onSuccess={() => {
                                fetchBankDetails();
                                fetchQuestions();
                                fetchTags();
                            }}
                        />
                        <GenerateQuestionsDialog
                            bankId={bankId}
                            onSuccess={() => {
                                fetchBankDetails();
                                fetchQuestions();
                                fetchTags();
                            }}
                        />
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
                                            setSelectedType("true_false");
                                            setTypeDialogOpen(false);
                                        }}
                                    >
                                        <FileQuestion className="mr-2 h-4 w-4" />
                                        Benar/Salah
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
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
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
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">B/S</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{bank.statistics?.true_false || 0}</p>
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
                                    <SelectItem value="true_false">Benar/Salah</SelectItem>
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
                        <BankQuestionCard
                            key={question.id}
                            question={question}
                            indexNumber={(page - 1) * 20 + index + 1}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
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

            {/* Question Editors Host */}
            <QuestionEditorHost
                selectedType={selectedType}
                onClose={() => {
                    setSelectedType("");
                    setEditingQuestion(null);
                }}
                bankId={bankId}
                onSuccess={() => {
                    fetchBankDetails();
                    fetchQuestions();
                    fetchTags();
                }}
                availableTags={availableTags}
                editingQuestion={editingQuestion || undefined}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Bank Information Dialog */}
            <Dialog open={editBankDialogOpen} onOpenChange={setEditBankDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Informasi Bank Soal</DialogTitle>
                        <DialogDescription>
                            Ubah nama, mata pelajaran, atau deskripsi bank soal ini
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveBank}>
                        <div className="space-y-4 py-2">
                            <div>
                                <Label htmlFor="bank-name">Nama Bank Soal</Label>
                                <Input
                                    id="bank-name"
                                    value={bankFormData.name}
                                    onChange={(e) =>
                                        setBankFormData({ ...bankFormData, name: e.target.value })
                                    }
                                    required
                                    placeholder="e.g., Bank Soal UTS Semester 1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="bank-subject">Mata Pelajaran</Label>
                                <Select
                                    value={bankFormData.subjectId}
                                    onValueChange={(value) =>
                                        setBankFormData({ ...bankFormData, subjectId: value })
                                    }
                                    required
                                >
                                    <SelectTrigger id="bank-subject">
                                        <SelectValue placeholder="Pilih mata pelajaran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name} ({s.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="bank-desc">Deskripsi (Optional)</Label>
                                <Textarea
                                    id="bank-desc"
                                    value={bankFormData.description}
                                    onChange={(e) =>
                                        setBankFormData({ ...bankFormData, description: e.target.value })
                                    }
                                    placeholder="Deskripsi bank soal..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditBankDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSavingBank}>
                                {isSavingBank ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Perubahan"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Pratinjau / Preview Dialog */}
            <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Pratinjau Bank Soal: {bank.name}
                        </DialogTitle>
                        <DialogDescription>
                            Tampilan pratinjau soal-soal di bank ini dengan format visual yang sama seperti pada ujian siswa
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-2">
                        {questions.map((question, index) => (
                            <BankQuestionCard
                                key={question.id}
                                question={question}
                                indexNumber={(page - 1) * 20 + index + 1}
                                onEdit={(q) => {
                                    setPreviewDialogOpen(false);
                                    handleEdit(q);
                                }}
                                onDelete={(id) => {
                                    setPreviewDialogOpen(false);
                                    handleDeleteClick(id);
                                }}
                            />
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
