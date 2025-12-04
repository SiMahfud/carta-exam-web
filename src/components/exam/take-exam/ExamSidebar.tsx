import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { Question, Answer } from "./types";

interface ExamSidebarProps {
    questions: Question[];
    answers: Map<string, Answer>;
    currentQuestionIndex: number;
    setCurrentQuestionIndex: (index: number) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

export function ExamSidebar({
    questions,
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    isSidebarOpen,
    setIsSidebarOpen
}: ExamSidebarProps) {
    const answeredCount = answers.size;
    const flaggedCount = Array.from(answers.values()).filter(a => a.isFlagged).length;

    return (
        <>
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-72 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block lg:w-80 lg:bg-transparent lg:border-none
                ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>
                <div className="h-full flex flex-col p-4 lg:p-0">
                    <div className="flex justify-between items-center mb-6 lg:hidden">
                        <h3 className="font-bold text-lg">Navigasi Soal</h3>
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none lg:border lg:shadow-sm bg-background/50 backdrop-blur-sm">
                        <div className="p-4 border-b bg-muted/20">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-background p-2 rounded-md border text-center">
                                    <div className="text-muted-foreground text-xs mb-1">Dijawab</div>
                                    <div className="font-bold text-green-600 text-lg">{answeredCount}</div>
                                </div>
                                <div className="bg-background p-2 rounded-md border text-center">
                                    <div className="text-muted-foreground text-xs mb-1">Ditandai</div>
                                    <div className="font-bold text-yellow-600 text-lg">{flaggedCount}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, idx) => {
                                    const answer = answers.get(q.id);
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                setCurrentQuestionIndex(idx);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`
                                                aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200
                                                ${idx === currentQuestionIndex
                                                    ? "bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary ring-offset-2"
                                                    : "bg-background hover:bg-muted border hover:border-primary/50"}
                                                ${answer?.answer && idx !== currentQuestionIndex ? "bg-green-50 text-green-700 border-green-200" : ""}
                                                ${answer?.isFlagged ? "ring-2 ring-yellow-400 ring-offset-1" : ""}
                                            `}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}
        </>
    );
}
