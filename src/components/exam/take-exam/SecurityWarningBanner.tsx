import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecurityWarningBannerProps {
    violationCount: number;
    violationType?: string;
    onDismiss?: () => void;
}

// Get Indonesian label for violation type
function getViolationLabel(type: string): string {
    const labels: Record<string, string> = {
        // From use-exam-security.ts
        TAB_SWITCH: "Pindah Tab",
        WINDOW_BLUR: "Keluar dari Jendela Ujian",
        RIGHT_CLICK: "Klik Kanan",
        KEYBOARD_SHORTCUT: "Shortcut Keyboard (Copy/Paste)",
        PRINT_ATTEMPT: "Mencoba Mencetak Halaman",
        DEVTOOLS: "Membuka Developer Tools",
        SCREENSHOT: "Mencoba Screenshot",
        FULLSCREEN_EXIT: "Keluar dari Layar Penuh",
        BACK_BUTTON: "Menekan Tombol Kembali",
        // From lockdown.ts
        tab_switch: "Pindah Tab",
        window_blur: "Keluar dari Jendela Ujian",
        context_menu: "Klik Kanan",
        copy: "Mencoba Copy",
        paste: "Mencoba Paste",
        cut: "Mencoba Cut",
        screenshot_attempt: "Mencoba Screenshot",
    };
    return labels[type] || type;
}

export function SecurityWarningBanner({ violationCount, violationType, onDismiss }: SecurityWarningBannerProps) {
    if (violationCount === 0) return null;

    const violationLabel = violationType ? getViolationLabel(violationType) : null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 animate-pulse flex-shrink-0" />
                <div className="flex flex-col">
                    <span className="font-bold">
                        ⚠️ Pelanggaran Terdeteksi!
                    </span>
                    <span className="text-sm opacity-90">
                        {violationLabel ? (
                            <>Anda melakukan pelanggaran: <strong>{violationLabel}</strong></>
                        ) : (
                            <>Pelanggaran keamanan terdeteksi.</>
                        )}
                        {" "}(Total: {violationCount} pelanggaran)
                    </span>
                </div>
            </div>
            {onDismiss && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-red-700 flex-shrink-0"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
