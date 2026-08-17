import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, AlertCircle, Save, Terminal, ChevronDown, ChevronUp, Zap, Clock, FileText, CheckCircle2, Cpu, Shield } from "lucide-react";
import { QuestionPreviewCard } from "./QuestionPreviewCard";

// ============================================================================
// Types
// ============================================================================

interface GenerateQuestionsDialogProps {
    bankId: string;
    onSuccess: () => void;
}

type StreamStep = 1 | 2 | 3 | 4;

interface StepInfo {
    step: StreamStep;
    label: string;
    provider?: string;
}

// ============================================================================
// Step Progress Component
// ============================================================================

const STEPS: { step: StreamStep; icon: React.ElementType; defaultLabel: string }[] = [
    { step: 1, icon: FileText, defaultLabel: "Menyiapkan konteks & prompt..." },
    { step: 2, icon: Cpu, defaultLabel: "Menghubungkan ke AI..." },
    { step: 3, icon: Shield, defaultLabel: "Memvalidasi format & kunci jawaban..." },
    { step: 4, icon: CheckCircle2, defaultLabel: "Selesai!" },
];

function StepProgress({ currentStep, stepInfo }: { currentStep: StreamStep; stepInfo: StepInfo | null }) {
    return (
        <div className="flex items-center gap-1 w-full">
            {STEPS.map(({ step, icon: Icon, defaultLabel }, idx) => {
                const isActive = currentStep === step;
                const isDone = currentStep > step;
                const label = (stepInfo?.step === step ? stepInfo.label : defaultLabel);

                return (
                    <div key={step} className="flex items-center flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`
                                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500
                                ${isDone
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                    : isActive
                                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30 animate-pulse'
                                        : 'bg-muted text-muted-foreground'
                                }
                            `}>
                                {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                    <Icon className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`} />
                                )}
                            </div>
                            <span className={`
                                text-[10px] leading-tight truncate transition-colors duration-300
                                ${isActive ? 'text-foreground font-semibold' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
                            `}>
                                {label}
                            </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`
                                flex-shrink-0 h-px mx-1 w-4 transition-colors duration-500
                                ${isDone ? 'bg-emerald-400' : 'bg-border'}
                            `} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Stream Terminal Component
// ============================================================================

function StreamTerminal({
    streamText,
    isVisible,
    onToggle,
}: {
    streamText: string;
    isVisible: boolean;
    onToggle: () => void;
}) {
    const terminalRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (terminalRef.current && isVisible) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [streamText, isVisible]);

    return (
        <div className="border rounded-lg overflow-hidden bg-slate-950 dark:bg-black/60">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-900 dark:bg-slate-950 text-slate-300 hover:text-white text-xs font-mono transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3" />
                    <span>AI Raw Output</span>
                    {streamText.length > 0 && (
                        <span className="text-slate-500">({streamText.length.toLocaleString()} chars)</span>
                    )}
                </div>
                {isVisible ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {isVisible && (
                <pre
                    ref={terminalRef}
                    className="p-3 text-[11px] leading-relaxed text-emerald-400 font-mono overflow-auto max-h-[200px] whitespace-pre-wrap break-all select-text"
                >
                    {streamText || <span className="text-slate-600 italic">Menunggu respon dari AI...</span>}
                    {streamText.length > 0 && (
                        <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
                    )}
                </pre>
            )}
        </div>
    );
}

// ============================================================================
// Stats Bar Component
// ============================================================================

function StatsBar({
    elapsedMs,
    charCount,
    chunkCount,
    provider,
}: {
    elapsedMs: number;
    charCount: number;
    chunkCount: number;
    provider: string | null;
}) {
    const seconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono px-1">
            <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="tabular-nums">{timeStr}</span>
            </div>
            <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span className="tabular-nums">{charCount.toLocaleString()} chars</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="tabular-nums">{chunkCount} chunks</span>
            </div>
            {provider && (
                <div className="ml-auto flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    <Cpu className="w-2.5 h-2.5" />
                    {provider}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Dialog Component
// ============================================================================

export function GenerateQuestionsDialog({ bankId, onSuccess }: GenerateQuestionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [prompt, setPrompt] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Options
    const [qType, setQType] = useState<string>("mc");
    const [qCount, setQCount] = useState(5);
    const [qDifficulty, setQDifficulty] = useState<string>("medium");
    const [replaceMode, setReplaceMode] = useState(false);
    const qTopic = ""; // topic is passed as options.topic below

    const [customDistribution, setCustomDistribution] = useState<{ [key: string]: number }>({
        mc: 0,
        complex_mc: 0,
        matching: 0,
        true_false: 0,
        short: 0,
        essay: 0
    });

    // Streaming state
    const [currentStep, setCurrentStep] = useState<StreamStep>(1);
    const [stepInfo, setStepInfo] = useState<StepInfo | null>(null);
    const [streamText, setStreamText] = useState("");
    const [showTerminal, setShowTerminal] = useState(true);
    const [charCount, setCharCount] = useState(0);
    const [chunkCount, setChunkCount] = useState(0);
    const [provider, setProvider] = useState<string | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);

    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Timer effect
    useEffect(() => {
        if (isGenerating) {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setElapsedMs(Date.now() - startTimeRef.current);
            }, 100);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isGenerating]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const convertFileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve({
                    base64,
                    mimeType: file.type
                });
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        setGeneratedQuestions([]);
        setStreamText("");
        setCharCount(0);
        setChunkCount(0);
        setProvider(null);
        setCurrentStep(1);
        setStepInfo(null);
        setElapsedMs(0);

        // Create abort controller for cancellation
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            let contextFile = undefined;
            if (file) {
                if (file.size > 20 * 1024 * 1024) {
                    throw new Error("File size exceeds 20MB limit for AI processing.");
                }
                contextFile = await convertFileToBase64(file);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const options: any = {
                type: qType,
                count: qCount,
                difficulty: qDifficulty,
                topic: qTopic || undefined
            };

            if (qType === 'mixed_custom') {
                options.type = 'all';
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dist: any = {};
                Object.entries(customDistribution).forEach(([k, v]) => {
                    if (v > 0) dist[k] = v;
                });

                if (Object.keys(dist).length === 0) {
                    throw new Error("Please specify at least one question count for Custom Mix.");
                }
                options.questionDistribution = dist;
            }

            // Call streaming endpoint
            const response = await fetch("/api/ai/generate-questions/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    promptText: prompt,
                    contextFile,
                    options,
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Tidak bisa membaca stream response.");
            }

            const decoder = new TextDecoder();
            let buffer = "";
            let currentEvent = "";
            let currentData = "";

            const handleEvent = (eventType: string, dataStr: string) => {
                if (!eventType || !dataStr) return;
                try {
                    const data = JSON.parse(dataStr);

                    switch (eventType) {
                        case "status": {
                            const step = data.step as StreamStep;
                            setCurrentStep(step);
                            setStepInfo({ step, label: data.label, provider: data.provider });
                            if (data.provider) {
                                setProvider(data.provider);
                            }
                            break;
                        }
                        case "token": {
                            setStreamText(prev => prev + (data.chunk || ""));
                            if (data.totalLength !== undefined) setCharCount(data.totalLength);
                            if (data.chunkIndex !== undefined) setChunkCount(data.chunkIndex);
                            break;
                        }
                        case "complete": {
                            // Post-process questions (add metadata matching ImportQuestionsDialog needs)
                            const getDefaultPoints = (type: string) => {
                                switch (type) {
                                    case "mc": return 1;
                                    case "complex_mc": return 2;
                                    case "matching": return 3;
                                    case "short": return 2;
                                    case "essay": return 0;
                                    case "true_false": return 1;
                                    default: return 1;
                                }
                            };

                            const questionsList = Array.isArray(data.questions) ? data.questions : [];
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const processed = questionsList.map((q: any, idx: number) => ({
                                ...q,
                                metadata: { imported: true, originalNo: idx + 1 },
                                tags: [],
                                defaultPoints: getDefaultPoints(q.type)
                            }));

                            setGeneratedQuestions(processed);

                            if (processed.length === 0) {
                                setError("AI generation produced no valid questions. Try adjusting your prompt.");
                            }

                            // Hide terminal on success
                            setShowTerminal(false);
                            break;
                        }
                        case "error": {
                            throw new Error(data.message || "Terjadi kesalahan saat generate soal.");
                        }
                    }
                } catch (parseErr) {
                    if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                        throw parseErr;
                    }
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (currentData) {
                        handleEvent(currentEvent || "message", currentData);
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep incomplete trailing line in buffer
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) {
                        // Empty line signals end of an SSE event block
                        if (currentData) {
                            handleEvent(currentEvent || "message", currentData);
                            currentEvent = "";
                            currentData = "";
                        }
                    } else if (line.startsWith("event: ")) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith("data: ")) {
                        const dataPart = line.slice(6);
                        currentData = currentData ? currentData + "\n" + dataPart : dataPart;
                    }
                }
            }

        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // User cancelled - not an error
                return;
            }
            console.error("Generation failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate questions. Please try again.";
            setError(errorMessage);
            toast({
                title: "Generation Failed",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [file, prompt, qType, qCount, qDifficulty, qTopic, customDistribution, toast]);

    const handleCancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsGenerating(false);
        }
    }, []);

    const handleSave = async () => {
        if (generatedQuestions.length === 0) return;

        setIsSaving(true);
        try {
            const url = `/api/question-banks/${bankId}/questions${replaceMode ? '?mode=replace' : ''}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(generatedQuestions),
            });

            if (response.ok) {
                const result = await response.json();
                toast({
                    title: replaceMode ? "Soal Digantikan!" : "Saved!",
                    description: `${result.created} questions ${replaceMode ? 'saved replacing all old questions' : 'saved successfully'}.`,
                });
                onSuccess();
                setOpen(false);
                // Reset state
                setGeneratedQuestions([]);
                setPrompt("");
                setFile(null);
                setStreamText("");
                setCurrentStep(1);
                setStepInfo(null);
                setReplaceMode(false);
            } else {
                throw new Error("Failed to save questions");
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to save questions.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 border-0 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md">
                    <Sparkles className="h-4 w-4" />
                    AI Generator
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Generate Questions with AI
                    </DialogTitle>
                    <DialogDescription>
                        Create questions automatically from a topic, text, or uploaded document (PDF/Image).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                    {/* Left: Controls */}
                    <div className="w-full md:w-1/3 p-4 md:p-6 space-y-4 md:overflow-y-auto bg-muted/30 flex-shrink-0">
                        <div className="space-y-2">
                            <Label>Topic / Context Text</Label>
                            <Textarea
                                placeholder="Enter a topic (e.g., 'Indonesian History') or paste existing study material here..."
                                className="min-h-[100px]"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Upload Material (PDF / Image)</Label>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="secondary"
                                    className="w-full justify-start"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {file ? (
                                        <span className="truncate">{file.name}</span>
                                    ) : (
                                        <span className="text-muted-foreground">Select File (Optional)</span>
                                    )}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf,image/*"
                                    onChange={handleFileChange}
                                />
                                {file && (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive self-end" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Question Type</Label>
                            <Select value={qType} onValueChange={setQType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mc">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True / False</SelectItem>
                                    <SelectItem value="essay">Essay</SelectItem>
                                    <SelectItem value="short">Short Answer</SelectItem>
                                    <SelectItem value="complex_mc">Complex MC</SelectItem>
                                    <SelectItem value="matching">Matching</SelectItem>
                                    <SelectItem value="mixed_custom">Custom Mix (Advanced)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {qType === 'mixed_custom' ? (
                            <div className="space-y-3 border p-3 rounded-md bg-muted/30">
                                <Label className="text-xs text-muted-foreground">Specify counts per type:</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(customDistribution).map((typeKey) => (
                                        <div key={typeKey} className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                                {typeKey.replace('_', ' ')}
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="h-8 text-sm"
                                                value={customDistribution[typeKey]}
                                                onChange={(e) => setCustomDistribution(prev => ({
                                                    ...prev,
                                                    [typeKey]: parseInt(e.target.value) || 0
                                                }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-right text-muted-foreground">
                                    Total: {Object.values(customDistribution).reduce((a, b) => a + b, 0)} questions
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Count</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={qCount}
                                    onChange={(e) => setQCount(parseInt(e.target.value))}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select value={qDifficulty} onValueChange={setQDifficulty}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 space-y-2">
                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={handleGenerate}
                                disabled={isGenerating || (!prompt && !file)}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Questions
                                    </>
                                )}
                            </Button>
                            {isGenerating && (
                                <Button
                                    variant="outline"
                                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={handleCancel}
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Preview / Stream */}
                    <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col bg-background md:overflow-hidden min-h-[400px] md:min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Preview</h3>
                            {generatedQuestions.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {generatedQuestions.length} questions generated
                                </span>
                            )}
                        </div>

                        {/* Streaming Progress UI */}
                        {isGenerating && (
                            <div className="space-y-3 mb-4">
                                {/* Step Progress Bar */}
                                <StepProgress currentStep={currentStep} stepInfo={stepInfo} />

                                {/* Stats Bar */}
                                <StatsBar
                                    elapsedMs={elapsedMs}
                                    charCount={charCount}
                                    chunkCount={chunkCount}
                                    provider={provider}
                                />

                                {/* Stream Terminal */}
                                <StreamTerminal
                                    streamText={streamText}
                                    isVisible={showTerminal}
                                    onToggle={() => setShowTerminal(v => !v)}
                                />
                            </div>
                        )}

                        {/* Results / Empty state */}
                        <div className="flex-1 md:overflow-y-auto min-h-[300px] border rounded-md p-4 bg-slate-50 dark:bg-slate-900/50">
                            {generatedQuestions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                    {isGenerating ? (
                                        <>
                                            <div className="relative">
                                                <Sparkles className="h-12 w-12 text-purple-400 animate-pulse" />
                                                <div className="absolute inset-0 h-12 w-12 rounded-full bg-purple-500/20 animate-ping" />
                                            </div>
                                            <p className="mt-4 font-medium text-foreground">AI sedang membuat soal...</p>
                                            <p className="text-sm mt-1">Lihat progress pada panel di atas</p>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-12 w-12 mb-4 text-purple-200" />
                                            <p>Ready to generate.</p>
                                            <p className="text-sm">Enter instructions or upload a file, then click Generate.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {generatedQuestions.map((question, idx) => (
                                        <QuestionPreviewCard
                                            key={idx}
                                            index={idx}
                                            question={question}
                                            onUpdate={(updated) => {
                                                const newQuestions = [...generatedQuestions];
                                                newQuestions[idx] = updated;
                                                setGeneratedQuestions(newQuestions);
                                            }}
                                            onDelete={() => {
                                                const newQuestions = generatedQuestions.filter((_, i) => i !== idx);
                                                setGeneratedQuestions(newQuestions);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Replace Mode Toggle */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="ai-replace-mode"
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                checked={replaceMode}
                                onChange={(e) => setReplaceMode(e.target.checked)}
                            />
                            <label
                                htmlFor="ai-replace-mode"
                                className="text-xs sm:text-sm font-medium text-foreground cursor-pointer select-none"
                            >
                                Hapus semua soal lama (Replace All)
                            </label>
                        </div>
                        {replaceMode && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Perhatian: Semua soal yang ada di bank soal ini akan dihapus dan digantikan.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleSave}
                            disabled={generatedQuestions.length === 0 || isSaving}
                            className={replaceMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {replaceMode ? "Gantikan & Simpan Soal" : "Simpan Soal"}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
