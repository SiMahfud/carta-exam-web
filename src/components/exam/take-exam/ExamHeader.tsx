import { Button } from "@/components/ui/button";
import { Clock, Send, Menu } from "lucide-react";

interface ExamHeaderProps {
    currentQuestionIndex: number;
    totalQuestions: number;
    timeRemaining: number;
    autoSaving: boolean;
    onShowSubmit: () => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

export function ExamHeader({
    currentQuestionIndex,
    totalQuestions,
    timeRemaining,
    autoSaving,
    onShowSubmit,
    isSidebarOpen,
    setIsSidebarOpen
}: ExamHeaderProps) {
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-20">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg hidden sm:block">Ujian Berlangsung</h1>
                        <p className="text-sm text-muted-foreground">
                            Soal {currentQuestionIndex + 1} <span className="text-muted-foreground/60">/ {totalQuestions}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6">
                    {autoSaving && <span className="text-xs text-muted-foreground animate-pulse hidden sm:inline-block">Menyimpan...</span>}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 ${timeRemaining < 300 ? "text-destructive bg-destructive/10" : "text-primary"}`}>
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                    </div>
                    <Button onClick={onShowSubmit} size="sm" className="shadow-lg shadow-primary/20">
                        <Send className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Kumpulkan</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
