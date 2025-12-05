import { AlertCircle } from "lucide-react";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { Question } from "./types";

interface QuestionRendererProps {
    question: Question;
    answer: any;
    onChange: (answer: any) => void;
}

export function QuestionRenderer({ question, answer, onChange }: QuestionRendererProps) {
    if (question.type === "mc") {
        return (
            <div className="space-y-3 max-w-3xl">
                {question.options?.map((option) => (
                    <label
                        key={option.label}
                        className={`
                            flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                            ${answer === option.label
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-muted bg-background hover:border-primary/30 hover:bg-muted/30"}
                        `}
                    >
                        <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors
                            ${answer === option.label
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50"}
                        `}>
                            {answer === option.label && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            {answer !== option.label && <span className="text-sm font-semibold">{option.label}</span>}
                        </div>

                        {/* Hidden radio for accessibility */}
                        <input
                            type="radio"
                            name="answer"
                            value={option.label}
                            checked={answer === option.label}
                            onChange={(e) => onChange(e.target.value)}
                            className="sr-only"
                        />

                        <div className="flex-1 pt-1">
                            <span className={`text-base w-full ${answer === option.label ? "font-medium text-foreground" : "text-foreground/80"}`}>
                                <MathHtmlRenderer html={option.text} />
                            </span>
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    if (question.type === "complex_mc") {
        const selectedAnswers = answer || [];
        return (
            <div className="space-y-4 max-w-3xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md w-fit">
                    <AlertCircle className="h-4 w-4" />
                    Pilih semua jawaban yang benar
                </div>
                {question.options?.map((option) => {
                    const isSelected = selectedAnswers.includes(option.label);
                    return (
                        <label
                            key={option.label}
                            className={`
                                flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                ${isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-muted bg-background hover:border-primary/30 hover:bg-muted/30"}
                            `}
                        >
                            <div className={`
                                flex items-center justify-center w-6 h-6 rounded border-2 shrink-0 transition-colors mt-0.5
                                ${isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/30 bg-background"}
                            `}>
                                {isSelected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>

                            <input
                                type="checkbox"
                                value={option.label}
                                checked={isSelected}
                                onChange={(e) => {
                                    const newAnswers = e.target.checked
                                        ? [...selectedAnswers, option.label]
                                        : selectedAnswers.filter((a: string) => a !== option.label);
                                    onChange(newAnswers);
                                }}
                                className="sr-only"
                            />

                            <div className="flex-1">
                                <span className={`text-base w-full ${isSelected ? "font-medium text-foreground" : "text-foreground/80"}`}>
                                    <MathHtmlRenderer html={option.text} />
                                </span>
                            </div>
                        </label>
                    );
                })}
            </div>
        );
    }

    if (question.type === "short") {
        return (
            <div className="max-w-xl">
                <input
                    type="text"
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-4 text-lg border-2 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all bg-background"
                    placeholder="Ketik jawaban singkat Anda di sini..."
                />
            </div>
        );
    }

    if (question.type === "essay") {
        return (
            <div className="max-w-3xl">
                <textarea
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={12}
                    className="w-full p-4 text-lg border-2 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none resize-none transition-all bg-background leading-relaxed"
                    placeholder="Ketik jawaban uraian Anda secara lengkap di sini..."
                />
                <div className="flex justify-end mt-2">
                    <span className="text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                        {answer ? answer.length : 0} karakter
                    </span>
                </div>
            </div>
        );
    }

    if (question.type === "matching") {
        return (
            <MatchingQuestionRenderer
                question={question}
                answer={answer}
                onChange={onChange}
            />
        );
    }

    return <div>Tipe soal tidak dikenali</div>;
}
