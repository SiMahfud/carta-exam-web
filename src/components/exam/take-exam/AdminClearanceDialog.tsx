"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Lock, AlertCircle, Info } from "lucide-react";

interface AdminClearanceDialogProps {
    open: boolean;
    onSubmit: (adminToken: string) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
    adminNotes?: string | null;
    examName?: string;
}

export function AdminClearanceDialog({
    open,
    onSubmit,
    onCancel,
    loading = false,
    error = null,
    adminNotes = null,
    examName = "Ujian"
}: AdminClearanceDialogProps) {
    const [token, setToken] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            onSubmit(token.trim().toUpperCase());
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <Lock className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-lg">Verifikasi Administrasi Sekolah</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        Akses ujian <strong>{examName}</strong> memerlukan verifikasi administrasi. Masukkan Token Dispensasi yang diberikan oleh petugas Tata Usaha / Administrasi.
                    </DialogDescription>
                </DialogHeader>

                {adminNotes && (
                    <div className="flex items-start gap-2.5 p-3 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                            <span className="font-semibold block">Catatan Petugas TU:</span>
                            <span>{adminNotes}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    <div className="space-y-2">
                        <Label htmlFor="admin-clearance-token">Token Dispensasi Administrasi</Label>
                        <Input
                            id="admin-clearance-token"
                            type="text"
                            placeholder="Contoh: ADM9X2"
                            value={token}
                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                            className="text-center text-2xl font-mono tracking-widest uppercase font-bold"
                            maxLength={12}
                            autoFocus
                            disabled={loading}
                        />
                        <p className="text-[11px] text-muted-foreground text-center">
                            Dapatkan kode token dengan melapor ke ruang Tata Usaha.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-md">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={!token.trim() || loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {loading ? "Memverifikasi..." : "Verifikasi & Mulai"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
