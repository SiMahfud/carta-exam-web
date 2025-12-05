import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Maximize, ShieldAlert } from "lucide-react";

interface FullscreenPromptProps {
    open: boolean;
    onConfirm: () => void;
    examName?: string;
}

export function FullscreenPrompt({ open, onConfirm, examName }: FullscreenPromptProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-xl text-center">
                        Mode Ujian Terkunci
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center space-y-3">
                        <p>
                            {examName ? `Ujian "${examName}"` : "Ujian ini"} akan dilakukan dalam mode layar penuh untuk menjaga integritas ujian.
                        </p>
                        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm text-left space-y-2">
                            <p className="font-medium flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Perhatian:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Anda tidak dapat keluar dari layar penuh</li>
                                <li>Perpindahan tab akan tercatat</li>
                                <li>Klik kanan dan copy-paste dinonaktifkan</li>
                                <li>Tekan ESC tidak akan menutup layar penuh</li>
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="w-full sm:w-auto px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                        <Maximize className="mr-2 h-4 w-4" />
                        Mulai Ujian (Layar Penuh)
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
