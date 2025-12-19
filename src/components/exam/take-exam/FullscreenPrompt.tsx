import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Maximize, ShieldAlert, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FullscreenPromptProps {
    open: boolean;
    onConfirm: (token?: string) => void;
    examName?: string;
    requireToken?: boolean;
    tokenError?: string | null;
}

export function FullscreenPrompt({
    open,
    onConfirm,
    examName,
    requireToken = false,
    tokenError
}: FullscreenPromptProps) {
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // If token required, get it from input
        if (requireToken) {
            const input = document.getElementById("resume-token") as HTMLInputElement;
            if (input && input.value) {
                onConfirm(input.value.toUpperCase());
            }
        } else {
            onConfirm();
        }
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                    <AlertDialogHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="h-8 w-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-xl text-center">
                            {requireToken ? "Token Diperlukan" : "Mode Ujian Terkunci"}
                        </AlertDialogTitle>
                        <div className="text-sm text-muted-foreground text-center space-y-4">
                            <p>
                                {examName ? `Ujian "${examName}"` : "Ujian ini"} akan dilakukan dalam mode layar penuh untuk menjaga integritas ujian.
                            </p>

                            {requireToken && (
                                <div className="text-left space-y-2">
                                    <Label htmlFor="resume-token">Masukkan Token untuk Melanjutkan</Label>
                                    <div className="relative">
                                        <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="resume-token"
                                            placeholder="Masukkan token ujian..."
                                            className="pl-9 uppercase"
                                            autoComplete="off"
                                            autoFocus
                                            onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                                        />
                                    </div>
                                    {tokenError && (
                                        <p className="text-sm text-destructive font-medium">{tokenError}</p>
                                    )}
                                </div>
                            )}

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
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center mt-4">
                        <AlertDialogAction
                            type="submit"
                            className="w-full sm:w-auto px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                            <Maximize className="mr-2 h-4 w-4" />
                            {requireToken ? "Verifikasi & Lanjutkan" : "Mulai Ujian (Layar Penuh)"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
