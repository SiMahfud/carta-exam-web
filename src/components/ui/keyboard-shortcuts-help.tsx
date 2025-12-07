"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsHelpProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({
    open,
    onOpenChange,
    shortcuts,
}: KeyboardShortcutsHelpProps) {
    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    const formatKey = (key: string) => {
        // Split sequence shortcuts
        const parts = key.split(' ');

        return parts.map((part, i) => {
            // Handle modifier keys
            const keys = part.split('+');

            return (
                <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="text-slate-400 mx-1">lalu</span>}
                    {keys.map((k, j) => (
                        <kbd
                            key={j}
                            className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-700 shadow-sm"
                        >
                            {k.toUpperCase()}
                        </kbd>
                    ))}
                </span>
            );
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>⌨️</span> Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {categoryShortcuts.map((shortcut) => (
                                    <div
                                        key={shortcut.key}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
                                    >
                                        <span className="text-sm text-slate-700">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {formatKey(shortcut.key)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                    <p className="text-xs text-slate-500">
                        Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-xs font-mono">ESC</kbd> untuk menutup
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
