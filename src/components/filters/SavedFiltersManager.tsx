"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Star, Trash2, Plus } from "lucide-react";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SavedFiltersManagerProps {
    page: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentFilters: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onApply: (filters: Record<string, any>) => void;
}

export function SavedFiltersManager({ page, currentFilters, onApply }: SavedFiltersManagerProps) {
    const { filters, loading, saveFilter, deleteFilter, setDefaultFilter } = useSavedFilters(page);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [newFilterName, setNewFilterName] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!newFilterName.trim()) return;

        setSaving(true);
        try {
            const result = await saveFilter(newFilterName, currentFilters, isDefault);
            if (result) {
                setIsSaveDialogOpen(false);
                setNewFilterName("");
                setIsDefault(false);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <Bookmark className="mr-2 h-4 w-4" />
                        Saved Filters
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Filter Tersimpan</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {loading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Memuat...
                        </div>
                    ) : filters.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Belum ada filter tersimpan
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto">
                            {filters.map((filter) => (
                                <div key={filter.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm group">
                                    <div
                                        className="flex-1 cursor-pointer flex items-center gap-2 text-sm"
                                        onClick={() => onApply(filter.filters)}
                                    >
                                        <span className={cn("font-medium", filter.isDefault && "text-primary")}>
                                            {filter.name}
                                        </span>
                                        {filter.isDefault && <Badge variant="secondary" className="text-[10px] h-4">Default</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDefaultFilter(filter.id);
                                            }}
                                            title="Jadikan Default"
                                        >
                                            <Star className={cn("h-3 w-3", filter.isDefault ? "fill-primary text-primary" : "text-muted-foreground")} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFilter(filter.id);
                                            }}
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setIsSaveDialogOpen(true);
                        }}
                        className="cursor-pointer"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Simpan Filter Saat Ini
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Simpan Filter</DialogTitle>
                        <DialogDescription>
                            Simpan kombinasi filter saat ini untuk digunakan kembali nanti.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nama
                            </Label>
                            <Input
                                id="name"
                                value={newFilterName}
                                onChange={(e) => setNewFilterName(e.target.value)}
                                className="col-span-3"
                                placeholder="Contoh: Belum Dinilai - Kelas 10"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="default" className="text-right">
                                Default
                            </Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="default"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="default" className="text-sm font-normal text-muted-foreground">
                                    Terapkan filter ini secara otomatis saat membuka halaman
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={!newFilterName.trim() || saving}>
                            {saving ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
