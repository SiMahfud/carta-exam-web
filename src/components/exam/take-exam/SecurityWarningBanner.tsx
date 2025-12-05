import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecurityWarningBannerProps {
    violationCount: number;
    onDismiss?: () => void;
}

export function SecurityWarningBanner({ violationCount, onDismiss }: SecurityWarningBannerProps) {
    if (violationCount === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <span className="font-medium">
                    Peringatan: {violationCount} pelanggaran keamanan terdeteksi.
                    Aktivitas Anda dicatat oleh sistem.
                </span>
            </div>
            {onDismiss && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-red-700"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
