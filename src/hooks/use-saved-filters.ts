"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface SavedFilter {
    id: string;
    name: string;
    page: string;
    filters: Record<string, string | string[] | boolean | null>;
    isDefault: boolean;
    createdAt: string;
}

export interface UseSavedFiltersReturn {
    filters: SavedFilter[];
    loading: boolean;
    defaultFilter: SavedFilter | null;
    saveFilter: (name: string, filters: Record<string, string | string[] | boolean | null>, isDefault?: boolean) => Promise<SavedFilter | null>;
    deleteFilter: (id: string) => Promise<boolean>;
    setDefaultFilter: (id: string) => Promise<boolean>;
    applyFilter: (filter: SavedFilter) => Record<string, string | string[] | boolean | null>;
    refresh: () => Promise<void>;
}

export function useSavedFilters(page: string): UseSavedFiltersReturn {
    const [filters, setFilters] = useState<SavedFilter[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchFilters = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/saved-filters?page=${encodeURIComponent(page)}`);
            if (response.ok) {
                const data = await response.json();
                setFilters(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching saved filters:", error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    const saveFilter = useCallback(async (
        name: string,
        filterValues: Record<string, string | string[] | boolean | null>,
        isDefault = false
    ): Promise<SavedFilter | null> => {
        try {
            const response = await fetch("/api/saved-filters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, page, filters: filterValues, isDefault }),
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Berhasil",
                    description: `Filter "${name}" berhasil disimpan`,
                });
                await fetchFilters();
                return data.data;
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to save filter");
            }
        } catch (error) {
            console.error("Error saving filter:", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan filter",
                variant: "destructive",
            });
            return null;
        }
    }, [page, fetchFilters, toast]);

    const deleteFilter = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/saved-filters/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Filter berhasil dihapus",
                });
                setFilters((prev) => prev.filter((f) => f.id !== id));
                return true;
            } else {
                throw new Error("Failed to delete filter");
            }
        } catch (error) {
            console.error("Error deleting filter:", error);
            toast({
                title: "Error",
                description: "Gagal menghapus filter",
                variant: "destructive",
            });
            return false;
        }
    }, [toast]);

    const setDefaultFilter = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/saved-filters/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Filter default berhasil diatur",
                });
                await fetchFilters();
                return true;
            } else {
                throw new Error("Failed to set default filter");
            }
        } catch (error) {
            console.error("Error setting default filter:", error);
            toast({
                title: "Error",
                description: "Gagal mengatur filter default",
                variant: "destructive",
            });
            return false;
        }
    }, [fetchFilters, toast]);

    const applyFilter = useCallback((filter: SavedFilter) => {
        return filter.filters;
    }, []);

    const defaultFilter = filters.find((f) => f.isDefault) || null;

    return {
        filters,
        loading,
        defaultFilter,
        saveFilter,
        deleteFilter,
        setDefaultFilter,
        applyFilter,
        refresh: fetchFilters,
    };
}
