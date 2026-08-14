import React from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineSyncBannerProps {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    onManualSync?: () => void;
}

export function OfflineSyncBanner({
    isOnline,
    pendingCount,
    isSyncing,
    onManualSync,
}: OfflineSyncBannerProps) {
    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    if (!isOnline) {
        return (
            <div className="bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300 z-30 sticky top-0">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                    <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
                    <span>
                        <strong>Koneksi Internet Terputus:</strong> Jawaban Anda tetap tersimpan aman di perangkat ini ({pendingCount} antrean) dan akan disinkronkan otomatis saat online.
                    </span>
                </div>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-30 sticky top-0 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                    <span>Menyinkronkan {pendingCount} jawaban tersimpan ke server...</span>
                </div>
            </div>
        );
    }

    if (isOnline && pendingCount > 0) {
        return (
            <div className="bg-emerald-700 text-white px-4 py-2 flex items-center justify-between shadow-md z-30 sticky top-0 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Koneksi kembali terhubung. Ada {pendingCount} jawaban tersimpan siap disinkronkan.</span>
                </div>
                {onManualSync && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onManualSync}
                        className="h-7 text-xs bg-white text-emerald-800 hover:bg-slate-100"
                    >
                        Sinkronkan Sekarang
                    </Button>
                )}
            </div>
        );
    }

    return null;
}
