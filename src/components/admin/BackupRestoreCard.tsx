"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload, Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BackupRestoreCard() {
    const { toast } = useToast();
    const [downloading, setDownloading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDownloadBackup = async () => {
        setDownloading(true);
        try {
            const res = await fetch("/api/admin/backup");
            if (!res.ok) throw new Error("Gagal mengunduh cadangan");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `carta-exam-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Cadangan Berhasil Diunduh",
                description: "File snapshot database berhasil disimpan di komputer Anda.",
            });
        } catch (err: any) {
            toast({
                title: "Gagal Mengunduh",
                description: err.message || "Terjadi kesalahan saat mengekspor database.",
                variant: "destructive",
            });
        } finally {
            setDownloading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleRestoreBackup = async () => {
        if (!selectedFile) return;

        setRestoring(true);
        try {
            const text = await selectedFile.text();
            const payload = JSON.parse(text);

            const res = await fetch("/api/admin/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal memulihkan database");

            toast({
                title: "Pemulihan Berhasil",
                description: data.message,
            });
            setSelectedFile(null);
        } catch (err: any) {
            toast({
                title: "Gagal Memulihkan",
                description: err.message || "File tidak valid.",
                variant: "destructive",
            });
        } finally {
            setRestoring(false);
        }
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Cadangan & Pemulihan Database
                </CardTitle>
                <CardDescription>
                    Kelola ekspor dan pemulihan snapshot data sekolah, bank soal, dan konfigurasi ujian.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Section */}
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                        <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                            <Download className="h-4 w-4 text-emerald-600" />
                            Buat Cadangan (Backup)
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Unduh seluruh konfigurasi mata pelajaran, kelas, bank soal, dan template ujian ke format JSON aman.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadBackup}
                            disabled={downloading}
                            className="w-full text-xs font-medium"
                        >
                            {downloading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    Menyiapkan Cadangan...
                                </>
                            ) : (
                                <>
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Unduh Snapshot Database (.json)
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Restore Section */}
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                        <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                            <Upload className="h-4 w-4 text-blue-600" />
                            Pulihkan Data (Restore)
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Pilih file cadangan <code>.json</code> yang pernah diunduh untuk dimasukkan ke sistem.
                        </p>
                        <div className="space-y-2">
                            <Input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="text-xs h-9 cursor-pointer"
                            />
                            <Button
                                size="sm"
                                onClick={handleRestoreBackup}
                                disabled={!selectedFile || restoring}
                                className="w-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {restoring ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                        Memulihkan Data...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                                        Mulai Pemulihan
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
