import { useState, useRef, useEffect } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { DocxGenerator } from "@/lib/docx-generator";
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
import { Upload, FileText, Check, AlertCircle, Loader2, Download } from "lucide-react";
import { QuestionPreviewCard } from "./QuestionPreviewCard";

interface ImportQuestionsDialogProps {
    bankId: string;
    onSuccess: () => void;
}

export function ImportQuestionsDialog({ bankId, onSuccess }: ImportQuestionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                    } catch {
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

    const handleDownloadTemplate = async () => {
        try {
            const blob = await DocxGenerator.generateQuestionBankTemplate();
            saveAs(blob, "template_soal_cartaexam.docx");
        } catch (error) {
            console.error("Failed to generate template", error);
            toast({
                title: "Gagal",
                description: "Gagal membuat file template.",
                variant: "destructive"
            });
        }
    };

    const parseQuestionsFromHtml = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const rows = Array.from(doc.querySelectorAll("table tr"));

        const allQuestions: any[] = [];
        let i = 0;

        while (i < rows.length) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            if (cells.length < 2) {
                i++;
                continue;
            }

            const colNo = cells[0].innerText.trim();

            if (colNo && !isNaN(parseInt(colNo))) {
                const rowspanAttr = cells[0].getAttribute("rowspan");
                const totalRows = rowspanAttr ? parseInt(rowspanAttr) : 1;
                const jenis = cells.length > 2 ? cells[2].innerText.trim() : "1";

                const q: any = {
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
                            const childRow = rows[i + j];
                            const childCells = childRow.querySelectorAll("td");
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
                const cellText = cellArray[k].innerText.trim();
                // Match A-E
                if (/^[A-Z]$/.test(cellText)) {
                    const label = cellText;
                    const text = cellArray[k + 1] ? cellArray[k + 1].innerHTML : "";

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
        // True / False (Type 6)
        else if (jenis === "6") {
            // Expecting "Benar" or "Salah" in startIndex (C1) or C1=Label, C3=V?
            // Based on generated template: C1="Salah", C3="v" is mostly for MC visuals?
            // Actually template has: C1="Salah", C3="v".
            // Let's look for "Benar" or "Salah" in C1.
            if (cellArray[startIndex]) {
                const val = cellArray[startIndex].innerText.trim().toLowerCase();
                if (val) {
                    // Normalize "benar"/"salah"
                    if (val.includes("benar") || val.includes("true") || val.includes("ya") || val.includes("yes")) q.answers.push("true");
                    if (val.includes("salah") || val.includes("false") || val.includes("tidak") || val.includes("no")) q.answers.push("false");
                }
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

        if (jenis === "6") {
            // q.answers contains "true" or "false" string based on parsing
            const ans = q.answers[0];
            const isTrue = ans === "true";
            // answerKey: correct is 0 for True, 1 for False (matching TrueFalseEditor)
            // Or use answer string? Schema says `answer`, Editor says `correct`.
            // Let's use `correct` to be safe with existing editor if it saves `correct` index 0/1.
            // Using 0=True, 1=False.
            return {
                ...base,
                type: "true_false",
                // Validations/Schema might expect `content.options`?
                // TrueFalseEditor uses implicit options.
                answerKey: { correct: isTrue ? 0 : 1 }
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
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            title="Download template import soal"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Template
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
                                    <QuestionPreviewCard
                                        key={idx}
                                        index={idx}
                                        question={question}
                                        onUpdate={(updated) => {
                                            const newQuestions = [...parsedQuestions];
                                            newQuestions[idx] = updated;
                                            setParsedQuestions(newQuestions);
                                        }}
                                        onDelete={() => {
                                            const newQuestions = parsedQuestions.filter((_, i) => i !== idx);
                                            setParsedQuestions(newQuestions);
                                        }}
                                    />
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
