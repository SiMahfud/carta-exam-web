"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Lock,
    Unlock,
    Key,
    X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportClearanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface PreviewSummary {
    total: number;
    valid: number;
    toLock: number;
    toClear: number;
    toDispense: number;
    notFound: number;
}

interface PreviewItem {
    rowNumber: number;
    nis: string;
    nama: string;
    originalStatus: string;
    normalizedStatus: "locked" | "cleared" | "dispensation";
    catatan: string;
    isValid: boolean;
    errorMessage?: string;
}

export function ImportClearanceDialog({
    open,
    onOpenChange,
    onSuccess,
}: ImportClearanceDialogProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [summary, setSummary] = useState<PreviewSummary | null>(null);
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const resetState = () => {
        setSelectedFile(null);
        setSummary(null);
        setPreviewItems([]);
        setErrorMsg(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileSelect = async (file: File) => {
        setSelectedFile(file);
        setErrorMsg(null);
        setPreviewing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("mode", "preview");

            const res = await fetch("/api/admin/clearance/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal memproses file Excel");
            }

            const data = await res.json();
            setSummary(data.summary);
            setPreviewItems(data.items || []);
        } catch (err: any) {
            console.error("Preview error:", err);
            setErrorMsg(err.message || "Terjadi kesalahan saat membaca file Excel.");
            setSummary(null);
            setPreviewItems([]);
        } finally {
            setPreviewing(false);
        }
    };

    const handleProcessImport = async () => {
        if (!selectedFile) return;
        setProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("mode", "process");

            const res = await fetch("/api/admin/clearance/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan perubahan administrasi");
            }

            const data = await res.json();
            toast({
                title: "Impor Berhasil",
                description: data.message || `Berhasil memperbarui ${data.updatedCount} status siswa.`,
            });

            onSuccess();
            onOpenChange(false);
            resetState();
        } catch (err: any) {
            toast({
                title: "Gagal Impor",
                description: err.message || "Terjadi kesalahan saat memproses data.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open("/api/admin/clearance/export?type=template", "_blank");
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) resetState();
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Impor Administrasi dari Excel</DialogTitle>
                            <DialogDescription>
                                Perbarui izin ujian siswa yang tertahan atau lunas administrasi secara masal.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Top Guide & Template Download */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-muted/60 border border-border/80 rounded-xl gap-3">
                        <div className="text-xs text-muted-foreground">
                            Format kolom wajib: <code className="bg-background px-1.5 py-0.5 rounded font-mono font-bold text-foreground">NIS</code> dan <code className="bg-background px-1.5 py-0.5 rounded font-mono font-bold text-foreground">Status</code> (opsional: <code className="bg-background px-1.5 py-0.5 rounded font-mono font-bold text-foreground">Catatan</code>).
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="shrink-0 gap-1.5 h-8 text-xs font-semibold"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Unduh Template
                        </Button>
                    </div>

                    {/* File Dropzone Area */}
                    {!selectedFile ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-center group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                <Upload className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">Pilih atau Tarik File Excel ke Sini</h4>
                            <p className="text-xs text-muted-foreground mt-1">Mendukung file .xlsx dan .csv</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3.5 border border-border bg-card rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                    <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-foreground">{selectedFile.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={resetState}
                                disabled={previewing || processing}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {previewing && (
                        <div className="p-6 text-center text-muted-foreground space-y-2">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            <p className="text-xs">Menganalisis baris file Excel dan mencocokkan NIS...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {errorMsg && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Preview Analysis Summary */}
                    {summary && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-3 bg-muted/60 border border-border/80 rounded-xl text-center">
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Baris</div>
                                    <div className="text-xl font-bold mt-0.5">{summary.total}</div>
                                </div>
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                                    <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Akan Terkunci</div>
                                    <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{summary.toLock}</div>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Akan Bebas</div>
                                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{summary.toClear}</div>
                                </div>
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                    <div className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400">NIS Tidak Ada</div>
                                    <div className="text-xl font-bold text-red-700 dark:text-red-300 mt-0.5">{summary.notFound}</div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-border/80 rounded-xl overflow-hidden">
                                <div className="p-2.5 bg-muted/40 font-semibold text-xs border-b border-border flex justify-between items-center">
                                    <span>Preview Data ({previewItems.length} baris ditampilkan)</span>
                                    <span className="text-muted-foreground font-normal text-[11px]">Pastikan NIS dan Status sesuai</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/20">
                                            <TableRow className="text-xs">
                                                <TableHead className="w-16">Baris</TableHead>
                                                <TableHead>NIS</TableHead>
                                                <TableHead>Nama Siswa</TableHead>
                                                <TableHead>Aksi Status</TableHead>
                                                <TableHead>Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewItems.map((item, idx) => (
                                                <TableRow key={idx} className={`text-xs ${!item.isValid ? "bg-red-500/5 text-red-700" : ""}`}>
                                                    <TableCell className="font-mono text-muted-foreground">#{item.rowNumber}</TableCell>
                                                    <TableCell className="font-mono font-semibold">{item.nis}</TableCell>
                                                    <TableCell>
                                                        {item.nama}
                                                        {!item.isValid && (
                                                            <div className="text-[10px] text-red-600 font-normal">{item.errorMessage}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.normalizedStatus === "locked" && (
                                                            <Badge variant="destructive" className="bg-amber-600 text-white gap-1 text-[10px] font-semibold">
                                                                <Lock className="w-2.5 h-2.5" /> Terkunci
                                                            </Badge>
                                                        )}
                                                        {item.normalizedStatus === "cleared" && (
                                                            <Badge className="bg-emerald-600 text-white gap-1 text-[10px] font-semibold">
                                                                <Unlock className="w-2.5 h-2.5" /> Bebas
                                                            </Badge>
                                                        )}
                                                        {item.normalizedStatus === "dispensation" && (
                                                            <Badge className="bg-blue-600 text-white gap-1 text-[10px] font-semibold">
                                                                <Key className="w-2.5 h-2.5" /> Dispensasi
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground truncate max-w-[150px]">
                                                        {item.catatan || "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            resetState();
                            onOpenChange(false);
                        }}
                        disabled={processing}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleProcessImport}
                        disabled={!summary || summary.valid === 0 || processing}
                        className="bg-primary gap-1.5"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Terapkan Perubahan ({summary?.valid || 0} Siswa)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
