"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
// Select components kept for future use
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Upload,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Loader2,
    X,
    FileDown,
    Users,
    GraduationCap,
    UserCog
} from "lucide-react";

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface PreviewData {
    total: number;
    toAdd: number;
    toUpdate: number;
    toDelete: number;
    errors: ValidationError[];
    isValid: boolean;
    preview: Array<{
        row: number;
        action: string;
        nama: string;
        username: string;
        role: string;
        kelas: string;
        hasError: boolean;
    }>;
}

interface ProcessResult {
    added: number;
    updated: number;
    deleted: number;
    skipped: number;
    classesCreated: string[];
    errors: ValidationError[];
}

interface BulkUserManagerProps {
    onSuccess?: () => void;
}

export function BulkUserManager({ onSuccess }: BulkUserManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"import" | "export">("import");
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
    const [exportType, setExportType] = useState("all");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setFile(null);
        setPreviewData(null);
        setProcessResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        resetState();
    }, [resetState]);

    // Download template
    const handleDownloadTemplate = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/users/bulk-export?type=template");
            if (!response.ok) throw new Error("Gagal mengunduh template");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "template_import_users.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            alert("Gagal mengunduh template");
        } finally {
            setIsLoading(false);
        }
    };

    // Export existing data
    const handleExport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/users/bulk-export?type=${exportType}`);
            if (!response.ok) throw new Error("Gagal mengekspor data");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `data_${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            alert("Gagal mengekspor data");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreviewData(null);
        setProcessResult(null);

        // Preview the file
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("mode", "preview");

            const response = await fetch("/api/users/bulk-import", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            setPreviewData(result.data);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Gagal membaca file";
            alert(errorMessage);
            resetState();
        } finally {
            setIsLoading(false);
        }
    };

    // Process import
    const handleProcessImport = async () => {
        if (!file) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("mode", "process");

            const response = await fetch("/api/users/bulk-import", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            setProcessResult(result.data);
            onSuccess?.();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Gagal memproses import";
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Kelola Masal
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Kelola User Masal</DialogTitle>
                    <DialogDescription>
                        Import, export, update, atau hapus user secara masal menggunakan file Excel
                    </DialogDescription>
                </DialogHeader>

                {/* Tab Buttons */}
                <div className="flex gap-2 border-b pb-2">
                    <Button
                        variant={activeTab === "import" ? "default" : "ghost"}
                        onClick={() => { setActiveTab("import"); resetState(); }}
                        className="gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Import
                    </Button>
                    <Button
                        variant={activeTab === "export" ? "default" : "ghost"}
                        onClick={() => { setActiveTab("export"); resetState(); }}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>

                {/* Import Tab */}
                {activeTab === "import" && (
                    <div className="space-y-4">
                        {/* Download Template Button */}
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                            <FileDown className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium">Template Import</p>
                                <p className="text-sm text-muted-foreground">
                                    Download template Excel dengan format yang benar
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                disabled={isLoading}
                            >
                                Download Template
                            </Button>
                        </div>

                        {/* File Upload */}
                        {!processResult && (
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                {!file ? (
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        <Upload className="h-10 w-10 text-muted-foreground" />
                                        <p className="font-medium">Pilih file atau drag & drop</p>
                                        <p className="text-sm text-muted-foreground">
                                            Format: .xlsx, .xls, atau .csv
                                        </p>
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-center gap-4">
                                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                        <div className="text-left">
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={resetState}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center gap-2 py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <p>Memproses...</p>
                            </div>
                        )}

                        {/* Preview Results */}
                        {previewData && !processResult && !isLoading && (
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-blue-700">{previewData.toAdd}</p>
                                        <p className="text-sm text-blue-600">Ditambahkan</p>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-yellow-700">{previewData.toUpdate}</p>
                                        <p className="text-sm text-yellow-600">Diperbarui</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-red-700">{previewData.toDelete}</p>
                                        <p className="text-sm text-red-600">Dihapus</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold">{previewData.total}</p>
                                        <p className="text-sm text-muted-foreground">Total Baris</p>
                                    </div>
                                </div>

                                {/* Errors */}
                                {previewData.errors.length > 0 && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                            <AlertCircle className="h-5 w-5" />
                                            {previewData.errors.length} Error Ditemukan
                                        </div>
                                        <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                                            {previewData.errors.slice(0, 10).map((error, i) => (
                                                <li key={i}>
                                                    Baris {error.row}: [{error.field}] {error.message}
                                                </li>
                                            ))}
                                            {previewData.errors.length > 10 && (
                                                <li>...dan {previewData.errors.length - 10} error lainnya</li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* Preview Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">Baris</TableHead>
                                                <TableHead className="w-20">Action</TableHead>
                                                <TableHead>Nama</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Kelas</TableHead>
                                                <TableHead className="w-16">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.preview.map((row) => (
                                                <TableRow key={row.row} className={row.hasError ? "bg-red-50" : ""}>
                                                    <TableCell>{row.row}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            row.action === 'delete' ? 'destructive' :
                                                                row.action === 'update' ? 'secondary' : 'default'
                                                        }>
                                                            {row.action || 'add'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{row.nama}</TableCell>
                                                    <TableCell>{row.username}</TableCell>
                                                    <TableCell>{row.role}</TableCell>
                                                    <TableCell>{row.kelas || '-'}</TableCell>
                                                    <TableCell>
                                                        {row.hasError ? (
                                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                                        ) : (
                                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={resetState}>
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleProcessImport}
                                        disabled={!previewData.isValid}
                                    >
                                        {previewData.isValid ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Proses Import
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-4 w-4 mr-2" />
                                                Perbaiki Error Terlebih Dahulu
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Process Results */}
                        {processResult && (
                            <div className="space-y-4">
                                <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                                    <h3 className="text-lg font-semibold text-green-700">Import Berhasil!</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-blue-700">{processResult.added}</p>
                                        <p className="text-sm text-blue-600">Ditambahkan</p>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-yellow-700">{processResult.updated}</p>
                                        <p className="text-sm text-yellow-600">Diperbarui</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-red-700">{processResult.deleted}</p>
                                        <p className="text-sm text-red-600">Dihapus</p>
                                    </div>
                                </div>

                                {processResult.classesCreated.length > 0 && (
                                    <div className="p-4 bg-purple-50 rounded-lg">
                                        <p className="font-medium text-purple-700">
                                            Kelas baru dibuat: {processResult.classesCreated.join(", ")}
                                        </p>
                                    </div>
                                )}

                                <Button onClick={handleClose} className="w-full">
                                    Selesai
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Export Tab */}
                {activeTab === "export" && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Export data user ke file Excel. File ini bisa diedit dan di-import kembali.
                        </p>

                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => setExportType("all")}
                                className={`p-4 border rounded-lg text-center hover:bg-muted transition ${exportType === "all" ? "border-primary bg-primary/5" : ""
                                    }`}
                            >
                                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="font-medium">Semua User</p>
                            </button>
                            <button
                                onClick={() => setExportType("students")}
                                className={`p-4 border rounded-lg text-center hover:bg-muted transition ${exportType === "students" ? "border-primary bg-primary/5" : ""
                                    }`}
                            >
                                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="font-medium">Siswa</p>
                            </button>
                            <button
                                onClick={() => setExportType("teachers")}
                                className={`p-4 border rounded-lg text-center hover:bg-muted transition ${exportType === "teachers" ? "border-primary bg-primary/5" : ""
                                    }`}
                            >
                                <UserCog className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="font-medium">Guru & Admin</p>
                            </button>
                        </div>

                        <Button
                            onClick={handleExport}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Download {exportType === "all" ? "Semua User" :
                                exportType === "students" ? "Data Siswa" : "Data Guru"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
