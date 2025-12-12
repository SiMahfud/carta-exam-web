import { useState, useRef } from "react";
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
import { generateQuestions } from "@/actions/ai";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, AlertCircle, Save, Check } from "lucide-react";
import { QuestionPreviewCard } from "./QuestionPreviewCard";

interface GenerateQuestionsDialogProps {
    bankId: string;
    onSuccess: () => void;
}

export function GenerateQuestionsDialog({ bankId, onSuccess }: GenerateQuestionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [prompt, setPrompt] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Options
    const [qType, setQType] = useState<any>("mc");
    const [qCount, setQCount] = useState(5);
    const [qDifficulty, setQDifficulty] = useState<any>("medium");
    const [qTopic, setQTopic] = useState("");

    const [customDistribution, setCustomDistribution] = useState<{ [key: string]: number }>({
        mc: 0,
        complex_mc: 0,
        matching: 0,
        true_false: 0,
        short: 0,
        essay: 0
    });

    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                // remove prefix data:application/pdf;base64,
                const base64 = result.split(',')[1];
                resolve({
                    base64,
                    mimeType: file.type
                });
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setGeneratedQuestions([]);

        try {
            let contextFile = undefined;
            if (file) {
                if (file.size > 20 * 1024 * 1024) {
                    throw new Error("File size exceeds 20MB limit for AI processing.");
                }
                contextFile = await convertFileToBase64(file);
            }

            let options: any = {
                type: qType,
                count: qCount,
                difficulty: qDifficulty,
                topic: qTopic || undefined
            };

            if (qType === 'mixed_custom') {
                options.type = 'all';
                // Filter out 0 counts
                const dist: any = {};
                Object.entries(customDistribution).forEach(([k, v]) => {
                    if (v > 0) dist[k] = v;
                });

                if (Object.keys(dist).length === 0) {
                    throw new Error("Please specify at least one question count for Custom Mix.");
                }
                options.questionDistribution = dist;
            }

            const questions = await generateQuestions(prompt, contextFile, options);

            // Post-process questions. Backend now returns validated Zod schema match.
            // We ensure it has metadata matching ImportQuestionsDialog needs.
            const processed = questions.map((q, idx) => ({
                ...q,
                metadata: { imported: true, originalNo: idx + 1 },
                tags: [],
                defaultPoints: 1
            }));

            setGeneratedQuestions(processed);

            if (processed.length === 0) {
                setError("AI generation produced no valid questions. Try adjusting your prompt.");
            }

        } catch (err: any) {
            console.error("Generation failed:", err);
            setError(err.message || "Failed to generate questions. Please try again.");
            toast({
                title: "Generation Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (generatedQuestions.length === 0) return;

        setIsSaving(true);
        try {
            // Re-use the existing bulk create endpoint
            const url = `/api/question-banks/${bankId}/questions`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(generatedQuestions),
            });

            if (response.ok) {
                const result = await response.json();
                toast({
                    title: "Saved!",
                    description: `${result.created} questions saved successfully.`,
                });
                onSuccess();
                setOpen(false);
                // Reset state
                setGeneratedQuestions([]);
                setPrompt("");
                setFile(null);
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
                        Generate Questions with Gemini AI
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

                        <div className="pt-4">
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
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Preview */}
                    <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col bg-background md:overflow-hidden min-h-[400px] md:min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Preview</h3>
                            {generatedQuestions.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {generatedQuestions.length} questions generated
                                </span>
                            )}
                        </div>

                        <div className="flex-1 md:overflow-y-auto min-h-[300px] border rounded-md p-4 bg-slate-50 dark:bg-slate-900/50">
                            {generatedQuestions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                    <Sparkles className="h-12 w-12 mb-4 text-purple-200" />
                                    <p>Ready to generate.</p>
                                    <p className="text-sm">Enter instructions or upload a file, then click Generate.</p>
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

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={generatedQuestions.length === 0 || isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Questions
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
