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
import { AlertCircle, Clock } from "lucide-react";

interface SubmitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    answeredCount: number;
    totalQuestions: number;
    onSubmit: () => void;
    submitting: boolean;
    minSubmitMinutes?: number;
    elapsedMinutes?: number;
}

export function SubmitDialog({
    open,
    onOpenChange,
    answeredCount,
    totalQuestions,
    onSubmit,
    submitting,
    minSubmitMinutes = 0,
    elapsedMinutes = 0
}: SubmitDialogProps) {
    const canSubmit = elapsedMinutes >= minSubmitMinutes;
    const remainingMinutes = Math.ceil(minSubmitMinutes - elapsedMinutes);

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Kumpulkan Ujian?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Anda telah menjawab {answeredCount} dari {totalQuestions} soal.
                        {answeredCount < totalQuestions && (
                            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <span>
                                    Masih ada <strong>{totalQuestions - answeredCount}</strong> soal yang belum dijawab. Yakin ingin mengumpulkan?
                                </span>
                            </div>
                        )}
                        {!canSubmit && minSubmitMinutes > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md flex items-start gap-2">
                                <Clock className="h-5 w-5 shrink-0 mt-0.5" />
                                <span>
                                    Anda baru bisa mengumpulkan ujian setelah <strong>{remainingMinutes} menit</strong> lagi.
                                    Waktu minimum pengumpulan: {minSubmitMinutes} menit.
                                </span>
                            </div>
                        )}
                        <p className="mt-4 text-sm text-muted-foreground">
                            Pastikan Anda telah memeriksa kembali jawaban Anda. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Periksa Kembali</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onSubmit}
                        disabled={submitting || !canSubmit}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {submitting ? "Mengumpulkan..." : canSubmit ? "Ya, Kumpulkan" : `Tunggu ${remainingMinutes} menit`}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
