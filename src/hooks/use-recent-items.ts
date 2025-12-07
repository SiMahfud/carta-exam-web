"use client";

import { useCallback, useEffect, useState } from "react";

export interface RecentItem {
    id: string;
    title: string;
    type: "exam" | "question" | "session" | "bank" | "template";
    href: string;
    timestamp: number;
}

const STORAGE_KEY = "cartaexam_recent_items";
const MAX_ITEMS_PER_TYPE = 5;
const MAX_TOTAL_ITEMS = 20;

function getStoredItems(): RecentItem[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveItems(items: RecentItem[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Storage might be full or unavailable
    }
}

export function useRecentItems() {
    const [items, setItems] = useState<RecentItem[]>([]);

    // Load items on mount
    useEffect(() => {
        setItems(getStoredItems());
    }, []);

    /**
     * Add an item to recent items
     */
    const addRecentItem = useCallback((item: Omit<RecentItem, "timestamp">) => {
        setItems((prev) => {
            // Remove existing item with same ID
            const filtered = prev.filter((i) => i.id !== item.id);

            // Add new item at the beginning
            const newItem: RecentItem = {
                ...item,
                timestamp: Date.now(),
            };
            const updated = [newItem, ...filtered];

            // Limit items per type
            const byType = updated.reduce((acc, i) => {
                acc[i.type] = (acc[i.type] || 0) + 1;
                if (acc[i.type] <= MAX_ITEMS_PER_TYPE) {
                    return acc;
                }
                return acc;
            }, {} as Record<string, number>);

            const limited = updated.filter((i) => {
                const count = byType[i.type] || 0;
                if (count > MAX_ITEMS_PER_TYPE) {
                    byType[i.type]--;
                    return false;
                }
                return true;
            }).slice(0, MAX_TOTAL_ITEMS);

            saveItems(limited);
            return limited;
        });
    }, []);

    /**
     * Clear all recent items
     */
    const clearRecentItems = useCallback(() => {
        setItems([]);
        saveItems([]);
    }, []);

    /**
     * Get items by type
     */
    const getItemsByType = useCallback((type: RecentItem["type"]) => {
        return items.filter((i) => i.type === type);
    }, [items]);

    /**
     * Get grouped items
     */
    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.type]) {
            acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
    }, {} as Record<RecentItem["type"], RecentItem[]>);

    return {
        items,
        groupedItems,
        addRecentItem,
        clearRecentItems,
        getItemsByType,
    };
}

// Type labels for display
export const typeLabels: Record<RecentItem["type"], string> = {
    exam: "Ujian",
    question: "Soal",
    session: "Sesi Ujian",
    bank: "Bank Soal",
    template: "Template",
};

// Type icons (lucide-react icon names)
export const typeIcons: Record<RecentItem["type"], string> = {
    exam: "FileText",
    question: "HelpCircle",
    session: "Calendar",
    bank: "Database",
    template: "FileCode",
};
