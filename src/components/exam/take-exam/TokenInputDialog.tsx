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
import { Key, AlertCircle } from "lucide-react";

interface TokenInputDialogProps {
    open: boolean;
    onSubmit: (token: string) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
    examName?: string;
}

export function TokenInputDialog({
    open,
    onSubmit,
    onCancel,
    loading = false,
    error = null,
    examName = "Ujian"
}: TokenInputDialogProps) {
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
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-full bg-orange-100">
                            <Key className="h-5 w-5 text-orange-600" />
                        </div>
                        <DialogTitle>Token Ujian Diperlukan</DialogTitle>
                    </div>
                    <DialogDescription>
                        Masukkan token yang diberikan oleh pengawas untuk memulai <strong>{examName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="token">Token Akses</Label>
                        <Input
                            id="token"
                            type="text"
                            placeholder="Contoh: ABC123"
                            value={token}
                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                            className="text-center text-2xl font-mono tracking-widest uppercase"
                            maxLength={10}
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
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
                        >
                            {loading ? "Memverifikasi..." : "Mulai Ujian"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
