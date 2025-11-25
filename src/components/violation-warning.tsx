import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ViolationWarningProps {
    open: boolean
    violationType: string
    violationCount: number
    maxViolations: number
    onClose: () => void
    onTerminate?: () => void
}

export function ViolationWarning({
    open,
    violationType,
    violationCount,
    maxViolations,
    onClose,
    onTerminate
}: ViolationWarningProps) {
    const isLastWarning = violationCount >= maxViolations - 1
    const willTerminate = violationCount >= maxViolations

    const getViolationMessage = () => {
        switch (violationType) {
            case 'tab_switch':
                return 'Anda terdeteksi berpindah tab atau aplikasi'
            case 'window_blur':
                return 'Anda terdeteksi keluar dari jendela ujian'
            case 'copy':
                return 'Anda mencoba menyalin teks'
            case 'paste':
                return 'Anda mencoba menempel teks'
            case 'context_menu':
                return 'Anda mencoba membuka menu klik kanan'
            case 'screenshot_attempt':
                return 'Anda terdeteksi mencoba screenshot'
            default:
                return 'Pelanggaran terdeteksi'
        }
    }

    if (willTerminate && onTerminate) {
        // Auto-terminate after reaching max violations
        setTimeout(() => onTerminate(), 1000)
    }

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 text-xl">
                        {willTerminate ? '⛔ Ujian Dihentikan!' : '⚠️ Peringatan!'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 text-base">
                        <p className="font-semibold text-gray-900">
                            {getViolationMessage()}
                        </p>

                        {!willTerminate && (
                            <>
                                <p className="text-sm text-gray-700">
                                    Pelanggaran ke-{violationCount} dari maksimal {maxViolations} pelanggaran.
                                </p>

                                {isLastWarning && (
                                    <p className="font-bold text-red-600">
                                        Ini adalah peringatan terakhir! Pelanggaran berikutnya akan menghentikan ujian Anda secara otomatis.
                                    </p>
                                )}

                                <p className="text-sm text-gray-600">
                                    Mohon fokus pada ujian dan jangan mencoba:
                                </p>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                    <li>Membuka tab atau aplikasi lain</li>
                                    <li>Menyalin atau menempel teks</li>
                                    <li>Mengambil screenshot</li>
                                    <li>Keluar dari jendela ujian</li>
                                </ul>
                            </>
                        )}

                        {willTerminate && (
                            <p className="font-bold text-red-600">
                                Anda telah mencapai batas maksimal pelanggaran. Ujian Anda akan dihentikan dan hasil yang ada akan disubmit secara otomatis.
                            </p>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction
                        onClick={onClose}
                        className={willTerminate ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                        {willTerminate ? 'Tutup' : 'Saya Mengerti'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
