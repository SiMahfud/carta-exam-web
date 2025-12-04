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
import { AlertCircle } from "lucide-react";

interface SubmitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    answeredCount: number;
    totalQuestions: number;
    onSubmit: () => void;
    submitting: boolean;
}

export function SubmitDialog({
    open,
    onOpenChange,
    answeredCount,
    totalQuestions,
    onSubmit,
    submitting
}: SubmitDialogProps) {
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
                        <p className="mt-4 text-sm text-muted-foreground">
                            Pastikan Anda telah memeriksa kembali jawaban Anda. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Periksa Kembali</AlertDialogCancel>
                    <AlertDialogAction onClick={onSubmit} disabled={submitting} className="bg-primary hover:bg-primary/90">
                        {submitting ? "Mengumpulkan..." : "Ya, Kumpulkan"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
