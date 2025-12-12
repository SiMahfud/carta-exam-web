"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    FileQuestion,
    FileText,
    Users,
    GraduationCap,
    BookOpen,
    Clock,
    Loader2,
    ArrowRight,
} from "lucide-react";

interface SearchResult {
    questions: Array<{ id: string; text: string; type: string; subjectName: string }>;
    exams: Array<{ id: string; name: string; status: string; type: 'template' | 'session' }>;
    students: Array<{ id: string; name: string; username: string }>;
    classes: Array<{ id: string; name: string; grade: number }>;
    subjects: Array<{ id: string; name: string }>;
}

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const RECENT_SEARCHES_KEY = "cartaexam_recent_searches";
const MAX_RECENT = 5;

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load recent searches
    useEffect(() => {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored));
            } catch { }
        }
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery("");
            setResults(null);
            setSelectedIndex(0);
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (query.length < 2) {
            setResults(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
                const data = await response.json();
                setResults(data.data);
                setSelectedIndex(0);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Save recent search
    const saveRecentSearch = useCallback((term: string) => {
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    // Get all navigable items
    const getAllItems = useCallback(() => {
        if (!results) return [];

        const items: Array<{ type: string; id: string; path: string; label: string }> = [];

        results.subjects.forEach(s => items.push({
            type: 'subject', id: s.id, path: `/admin/question-banks?subject=${s.id}`, label: s.name
        }));
        results.questions.forEach(q => items.push({
            type: 'question', id: q.id, path: `/admin/question-banks?q=${q.id}`, label: q.text
        }));
        results.exams.forEach(e => items.push({
            type: 'exam', id: e.id,
            path: e.type === 'template' ? `/admin/exam-templates?id=${e.id}` : `/admin/exam-sessions/${e.id}`,
            label: e.name
        }));
        results.students.forEach(s => items.push({
            type: 'student', id: s.id, path: `/admin/users?id=${s.id}`, label: s.name
        }));
        results.classes.forEach(c => items.push({
            type: 'class', id: c.id, path: `/admin/classes?id=${c.id}`, label: c.name
        }));

        return items;
    }, [results]);

    // Navigate to selected item
    const navigateTo = useCallback((path: string) => {
        if (query) saveRecentSearch(query);
        onOpenChange(false);
        router.push(path);
    }, [query, saveRecentSearch, onOpenChange, router]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const items = getAllItems();

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, items.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && items[selectedIndex]) {
            e.preventDefault();
            navigateTo(items[selectedIndex].path);
        } else if (e.key === "Escape") {
            onOpenChange(false);
        }
    }, [getAllItems, selectedIndex, navigateTo, onOpenChange]);


    const hasResults = results && (
        results.subjects.length > 0 ||
        results.questions.length > 0 ||
        results.exams.length > 0 ||
        results.students.length > 0 ||
        results.classes.length > 0
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center border-b px-4">
                    <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        placeholder="Cari di CartaExam..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="border-0 focus-visible:ring-0 text-lg h-14"
                    />
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    <Badge variant="outline" className="ml-2 shrink-0">
                        Ctrl+K
                    </Badge>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {/* Recent Searches (when no query) */}
                    {!query && recentSearches.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Pencarian Terakhir
                            </div>
                            {recentSearches.map((term, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(term)}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm"
                                >
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    {term}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {query.length >= 2 && !isLoading && !hasResults && (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada hasil untuk &quot;{query}&quot;</p>
                        </div>
                    )}

                    {/* Search Results */}
                    {hasResults && (
                        <div className="p-2">
                            {/* Subjects */}
                            {results.subjects.length > 0 && (
                                <ResultSection
                                    title="Mata Pelajaran"
                                    icon={<BookOpen className="h-4 w-4" />}
                                    items={results.subjects}
                                    selectedIndex={selectedIndex}
                                    startIndex={0}
                                    onSelect={(item) => navigateTo(`/admin/question-banks?subject=${item.id}`)}
                                    renderItem={(item) => item.name}
                                />
                            )}

                            {/* Questions */}
                            {results.questions.length > 0 && (
                                <ResultSection
                                    title="Soal"
                                    icon={<FileQuestion className="h-4 w-4" />}
                                    items={results.questions}
                                    selectedIndex={selectedIndex}
                                    startIndex={results.subjects.length}
                                    onSelect={(item) => navigateTo(`/admin/question-banks?q=${item.id}`)}
                                    renderItem={(item) => (
                                        <div className="flex items-center gap-2">
                                            <span className="truncate flex-1">{item.text}</span>
                                            <Badge variant="outline" className="shrink-0 text-xs">
                                                {item.type}
                                            </Badge>
                                        </div>
                                    )}
                                />
                            )}

                            {/* Exams */}
                            {results.exams.length > 0 && (
                                <ResultSection
                                    title="Ujian"
                                    icon={<FileText className="h-4 w-4" />}
                                    items={results.exams}
                                    selectedIndex={selectedIndex}
                                    startIndex={results.subjects.length + results.questions.length}
                                    onSelect={(item) => navigateTo(
                                        item.type === 'template'
                                            ? `/admin/exam-templates?id=${item.id}`
                                            : `/admin/exam-sessions/${item.id}`
                                    )}
                                    renderItem={(item) => (
                                        <div className="flex items-center gap-2">
                                            <span className="truncate flex-1">{item.name}</span>
                                            <Badge
                                                variant={item.type === 'template' ? 'secondary' : 'default'}
                                                className="shrink-0 text-xs"
                                            >
                                                {item.type === 'template' ? 'Template' : item.status}
                                            </Badge>
                                        </div>
                                    )}
                                />
                            )}

                            {/* Students */}
                            {results.students.length > 0 && (
                                <ResultSection
                                    title="Siswa"
                                    icon={<GraduationCap className="h-4 w-4" />}
                                    items={results.students}
                                    selectedIndex={selectedIndex}
                                    startIndex={results.subjects.length + results.questions.length + results.exams.length}
                                    onSelect={(item) => navigateTo(`/admin/users?id=${item.id}`)}
                                    renderItem={(item) => (
                                        <div className="flex items-center gap-2">
                                            <span>{item.name}</span>
                                            <span className="text-muted-foreground text-xs">@{item.username}</span>
                                        </div>
                                    )}
                                />
                            )}

                            {/* Classes */}
                            {results.classes.length > 0 && (
                                <ResultSection
                                    title="Kelas"
                                    icon={<Users className="h-4 w-4" />}
                                    items={results.classes}
                                    selectedIndex={selectedIndex}
                                    startIndex={results.subjects.length + results.questions.length + results.exams.length + results.students.length}
                                    onSelect={(item) => navigateTo(`/admin/classes?id=${item.id}`)}
                                    renderItem={(item) => (
                                        <div className="flex items-center gap-2">
                                            <span>{item.name}</span>
                                            <Badge variant="outline" className="text-xs">Kelas {item.grade}</Badge>
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                        Navigasi
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                        Pilih
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                        Tutup
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Result Section Component
function ResultSection<T extends { id: string }>({
    title,
    icon,
    items,
    selectedIndex,
    startIndex,
    onSelect,
    renderItem,
}: {
    title: string;
    icon: React.ReactNode;
    items: T[];
    selectedIndex: number;
    startIndex: number;
    onSelect: (item: T) => void;
    renderItem: (item: T) => React.ReactNode;
}) {
    return (
        <div className="mb-2">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                {icon}
                {title}
            </div>
            {items.map((item, i) => (
                <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 text-sm transition-colors ${selectedIndex === startIndex + i
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                        }`}
                >
                    <span className="truncate flex-1">{renderItem(item)}</span>
                    {selectedIndex === startIndex + i && (
                        <ArrowRight className="h-4 w-4 shrink-0" />
                    )}
                </button>
            ))}
        </div>
    );
}
