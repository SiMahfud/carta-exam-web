import { useState, useRef, useEffect } from "react";
// @ts-ignore
import mammoth from "mammoth";
import katex from "katex";
import "katex/dist/katex.min.css";

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
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";

interface ImportQuestionsDialogProps {
    bankId: string;
    onSuccess: () => void;
}

export function ImportQuestionsDialog({ bankId, onSuccess }: ImportQuestionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
    const [replaceMode, setReplaceMode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Render Math / KaTeX
    useEffect(() => {
        if (parsedQuestions.length > 0 && previewContainerRef.current) {
            renderMathInElement(previewContainerRef.current);
        }
    }, [parsedQuestions]);

    const renderMathInElement = (element: HTMLElement) => {
        const render = () => {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            const nodesToReplace: { node: Text, replacement: DocumentFragment }[] = [];

            let node: Node | null;
            while (node = walker.nextNode()) {
                const text = node.nodeValue;
                if (!text) continue;

                // Check for delimiters
                if (!text.includes('$')) continue;

                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let processed = false;

                // Regex matches:
                // 1. $$...$$ (Display Mode)
                // 2. $...$ (Inline Mode)
                const regex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

                let match;
                while ((match = regex.exec(text)) !== null) {
                    processed = true;
                    // Add text before match
                    const before = text.slice(lastIndex, match.index);
                    if (before) fragment.appendChild(document.createTextNode(before));

                    const displayMath = match[1];
                    const inlineMath = match[2];

                    const mathExpression = displayMath || inlineMath;
                    const isDisplay = !!displayMath;

                    const katexSpan = document.createElement('span');
                    try {
                        katex.render(mathExpression, katexSpan, {
                            throwOnError: false,
                            displayMode: isDisplay
                        });
                    } catch (e) {
                        katexSpan.textContent = match[0];
                    }
                    fragment.appendChild(katexSpan);

                    lastIndex = regex.lastIndex;
                }

                if (processed) {
                    const remaining = text.slice(lastIndex);
                    if (remaining) fragment.appendChild(document.createTextNode(remaining));
                    nodesToReplace.push({ node: node as Text, replacement: fragment });
                }
            }

            nodesToReplace.forEach(({ node, replacement }) => {
                node.parentNode?.replaceChild(replacement, node);
            });
        };

        render();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setParsedQuestions([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            // Parse HTML to Questions
            const questions = parseQuestionsFromHtml(html);

            if (questions.length === 0) {
                setError("Tidak ditemukan soal dalam file docx. Pastikan format tabel sesuai template.");
            } else {
                setParsedQuestions(questions);
            }
        } catch (err) {
            console.error("Error parsing DOCX:", err);
            setError("Gagal memproses file DOCX. Pastikan file tidak corrupt.");
        } finally {
            setIsLoading(false);
        }
    };

    const parseQuestionsFromHtml = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const rows = Array.from(doc.querySelectorAll("table tr"));

        let allQuestions: any[] = [];
        let i = 0;

        while (i < rows.length) {
            let row = rows[i];
            let cells = row.querySelectorAll("td");

            if (cells.length < 2) {
                i++;
                continue;
            }

            let colNo = cells[0].innerText.trim();

            if (colNo && !isNaN(parseInt(colNo))) {
                let rowspanAttr = cells[0].getAttribute("rowspan");
                let totalRows = rowspanAttr ? parseInt(rowspanAttr) : 1;
                let jenis = cells.length > 2 ? cells[2].innerText.trim() : "1";

                let q: any = {
                    metadata: { originalNo: colNo, originalType: jenis },
                    rawQuestion: cells[1].innerHTML,
                    options: [],
                    answers: [], // Stores raw answers (keys/text)
                    matching: { left: [], right: [], pairs: [] }
                };

                processDataRow(cells, q, 3, jenis);

                if (totalRows > 1) {
                    for (let j = 1; j < totalRows; j++) {
                        if ((i + j) < rows.length) {
                            let childRow = rows[i + j];
                            let childCells = childRow.querySelectorAll("td");
                            processDataRow(childCells, q, 0, jenis);
                        }
                    }
                    i += (totalRows - 1);
                }

                allQuestions.push(formatQuestionForApi(q, jenis));
            }
            i++;
        }

        return allQuestions.filter(q => q !== null);
    };

    const processDataRow = (cells: NodeList, q: any, startIndex: number, jenis: string) => {
        const cellArray = Array.from(cells) as HTMLElement[];

        // Matching (Type 3)
        if (jenis === "3") {
            const getTxt = (idx: number) => cellArray[startIndex + idx]?.innerText?.trim();

            const kdKiri = getTxt(0);
            const txtKiri = getTxt(1);
            const kdKanan = getTxt(2);
            const txtKanan = getTxt(3);
            const keyL = getTxt(4);
            const keyR = getTxt(5);

            if (kdKiri && txtKiri) q.matching.left.push({ id: kdKiri, text: txtKiri });
            if (kdKanan && txtKanan) q.matching.right.push({ id: kdKanan, text: txtKanan });

            if (keyL && keyR) {
                const rightKeys = keyR.split(',').map(s => s.trim());
                rightKeys.forEach(rKey => {
                    q.matching.pairs.push({ left: keyL, right: rKey });
                });
            }
        }
        // MC / Complex MC (Type 1 & 2)
        else if (jenis === "1" || jenis === "2") {
            for (let k = startIndex; k < cellArray.length; k++) {
                let cellText = cellArray[k].innerText.trim();
                // Match A-E
                if (/^[A-Z]$/.test(cellText)) {
                    let label = cellText;
                    let text = cellArray[k + 1] ? cellArray[k + 1].innerHTML : "";

                    q.options.push({ label, text });

                    // Check 'v'
                    for (let x = k + 2; x < cellArray.length; x++) {
                        if (cellArray[x] && cellArray[x].innerText.trim().toLowerCase() === 'v') {
                            q.answers.push(label);
                        }
                    }
                    // Skip used cells? No, loop increments k
                    break;
                }
            }
        }
        // Short Answer / Essay (Type 4 & 5)
        else if (jenis === "4" || jenis === "5") {
            if (cellArray[startIndex]) {
                const val = cellArray[startIndex].innerText.trim();
                if (val) q.answers.push(val);
            }
        }
    };

    const formatQuestionForApi = (q: any, jenis: string) => {
        const base = {
            content: { question: q.rawQuestion },
            tags: [],
            difficulty: "medium",
            defaultPoints: 1,
            metadata: { imported: true, originalNo: q.metadata.originalNo }
        };

        if (jenis === "1") {
            const optionLabels = ["A", "B", "C", "D", "E"];
            const optionsContent = optionLabels.map(lbl => {
                const opt = q.options.find((o: any) => o.label === lbl);
                return opt ? opt.text : "";
            });
            const correctLabel = q.answers[0];
            const correctIndex = optionLabels.indexOf(correctLabel);

            return {
                ...base,
                type: "mc",
                content: { ...base.content, options: optionsContent },
                answerKey: { correct: correctIndex !== -1 ? correctIndex : 0 }
            };
        }

        if (jenis === "2") {
            // Use actual options found in the file
            const optionsContent = q.options.map((o: any) => o.text);

            // Map correct answer labels (A, B, etc.) to their indices in the options array
            const correctIndices = q.answers.map((ans: string) =>
                q.options.findIndex((o: any) => o.label === ans)
            ).filter((i: number) => i !== -1);

            return {
                ...base,
                type: "complex_mc",
                content: { ...base.content, options: optionsContent },
                answerKey: { correctIndices }
            };
        }

        if (jenis === "3") {
            const leftItems = q.matching.left.map((item: any) => ({
                id: crypto.randomUUID(),
                text: item.text,
                originalId: item.id
            }));
            const rightItems = q.matching.right.map((item: any) => ({
                id: crypto.randomUUID(),
                text: item.text,
                originalId: item.id
            }));
            const matches = q.matching.pairs.map((pair: any) => {
                const left = leftItems.find((l: any) => l.originalId === pair.left);
                const right = rightItems.find((r: any) => r.originalId === pair.right);
                if (left && right) return { leftId: left.id, rightId: right.id };
                return null;
            }).filter(Boolean);

            return {
                ...base,
                type: "matching",
                content: {
                    ...base.content,
                    leftItems: leftItems.map(({ id, text }: any) => ({ id, text })),
                    rightItems: rightItems.map(({ id, text }: any) => ({ id, text }))
                },
                answerKey: { matches }
            };
        }

        if (jenis === "4") {
            return {
                ...base,
                type: "short",
                answerKey: { acceptedAnswers: q.answers, caseSensitive: false }
            };
        }

        if (jenis === "5") {
            return {
                ...base,
                type: "essay",
                answerKey: { modelAnswer: q.answers[0] || "" }
            };
        }

        return null;
    };

    const handleImport = async () => {
        if (parsedQuestions.length === 0) return;

        setIsLoading(true);
        try {
            const url = `/api/question-banks/${bankId}/questions${replaceMode ? '?mode=replace' : ''}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedQuestions),
            });

            if (response.status === 200 || response.status === 201) {
                const result = await response.json();
                toast({
                    title: "Import Berhasil",
                    description: `${result.created} soal berhasil diimport.`,
                });
                onSuccess();
                setOpen(false);
            } else {
                throw new Error("Gagal menyimpan soal");
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat menyimpan soal.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get type label
    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Uraian/Esai",
        };
        return labels[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import DOCX
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Soal dari DOCX</DialogTitle>
                    <DialogDescription>
                        Upload file DOCX, periksa preview, lalu simpan.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* File Upload Section */}
                    <div className="flex items-center gap-4 border p-4 rounded-md bg-muted/50 flex-shrink-0">
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                            Pilih File DOCX
                        </Button>
                        <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />

                        {parsedQuestions.length > 0 && (
                            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                                <Check className="h-4 w-4" />
                                {parsedQuestions.length} soal ditemukan
                            </span>
                        )}
                    </div>

                    {/* Replace Mode Toggle */}
                    <div className="flex items-center space-x-2 px-1">
                        <input
                            type="checkbox"
                            id="replace-mode"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={replaceMode}
                            onChange={(e) => setReplaceMode(e.target.checked)}
                        />
                        <label
                            htmlFor="replace-mode"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Hapus semua soal lama (Replace All)
                        </label>
                    </div>
                    {replaceMode && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠️ Perhatian: Semua soal yang ada di bank soal ini akan dihapus dan digantikan dengan hasil import.
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-4 text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                            <AlertCircle className="h-4 w-4" />
                            <div className="flex-1">
                                <h5 className="font-medium">Error</h5>
                                <div className="text-sm">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Preview Section */}
                    {parsedQuestions.length > 0 && (
                        <div className="flex-1 border rounded-md p-4 overflow-y-auto" ref={previewContainerRef}>
                            <div className="space-y-6">
                                {parsedQuestions.map((question, idx) => (
                                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card text-card-foreground shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center">
                                                <Badge variant="outline">No. {question.metadata.originalNo}</Badge>
                                                <Badge variant="secondary">{getTypeLabel(question.type)}</Badge>
                                            </div>
                                        </div>

                                        <div
                                            className="text-sm font-medium prose dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: question.content.question }}
                                        />

                                        {/* MC Preview */}
                                        {question.type === 'mc' && (
                                            <div className="space-y-3">
                                                <div className="space-y-2 pl-4">
                                                    {question.content.options.map((opt: string, i: number) => {
                                                        const isCorrect = i === question.answerKey.correct;
                                                        return (
                                                            <div key={i} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                <div className="flex items-center justify-center h-5 w-5 rounded-full border border-primary text-[10px] flex-shrink-0 mt-0.5">
                                                                    {["A", "B", "C", "D", "E"][i]}
                                                                </div>
                                                                <div className="text-sm flex-1" dangerouslySetInnerHTML={{ __html: opt }} />
                                                                {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ KUNCI</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Complex MC Preview */}
                                        {question.type === 'complex_mc' && (
                                            <div className="space-y-3">
                                                <div className="space-y-2 pl-4">
                                                    {question.content.options.map((opt: string, i: number) => {
                                                        const isCorrect = question.answerKey.correctIndices.includes(i);
                                                        return (
                                                            <div key={i} className={`flex items-start gap-3 p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'hover:bg-muted/50'}`}>
                                                                <div className="h-4 w-4 border rounded-sm flex-shrink-0 mt-1" />
                                                                <div className="text-sm flex-1" dangerouslySetInnerHTML={{ __html: opt }} />
                                                                {isCorrect && <span className="ml-auto text-green-600 font-semibold text-xs">✓ KUNCI</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Matching Preview */}
                                        {question.type === 'matching' && (
                                            <div className="space-y-3 pl-4">
                                                <p className="text-sm font-semibold text-muted-foreground mb-2">Preview Pasangan:</p>
                                                <div className="border rounded-lg p-4 bg-muted/10">
                                                    <MatchingQuestionRenderer
                                                        question={{
                                                            id: `import-${idx}`,
                                                            questionText: "",
                                                            leftItems: question.content.leftItems,
                                                            rightItems: question.content.rightItems
                                                        }}
                                                        answer={question.answerKey.matches?.map((m: any) => ({
                                                            left: m.leftId,
                                                            right: m.rightId
                                                        })) || []}
                                                        onChange={() => { }} // Read-only
                                                    />
                                                </div>
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    Matches detected: {question.answerKey.matches?.length} pair(s)
                                                </div>
                                            </div>
                                        )}

                                        {/* Short / Essay Preview */}
                                        {(question.type === 'short' || question.type === 'essay') && (
                                            <div className="space-y-2 pl-4">
                                                <div className="p-3 bg-muted/20 border rounded-lg">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Kunci Jawaban:</p>
                                                    <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                                                        {question.type === 'short'
                                                            ? question.answerKey.acceptedAnswers?.join(' / ')
                                                            : question.answerKey.modelAnswer}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 flex-shrink-0">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleImport} disabled={parsedQuestions.length === 0 || isLoading}>
                        {isLoading ? "Menyimpan..." : "Import Sekarang"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
