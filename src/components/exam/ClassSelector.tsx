"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Class {
    id: string;
    name: string;
    grade: number;
}

interface ClassSelectorProps {
    classes: Class[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
}

export function ClassSelector({ classes, selectedIds, onToggle, onSelectAll }: ClassSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter classes by search
    const filteredClasses = useMemo(() => {
        return classes.filter(cls =>
            cls.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classes, searchQuery]);

    // Check if all filtered classes are selected
    const allSelected = filteredClasses.length > 0 &&
        filteredClasses.every(cls => selectedIds.includes(cls.id));

    const handleSelectAll = () => {
        if (allSelected) {
            // Deselect all filtered
            const idsToRemove = new Set(filteredClasses.map(c => c.id));
            onSelectAll(selectedIds.filter(id => !idsToRemove.has(id)));
        } else {
            // Select all filtered
            const newIds = [...selectedIds];
            filteredClasses.forEach(cls => {
                if (!newIds.includes(cls.id)) {
                    newIds.push(cls.id);
                }
            });
            onSelectAll(newIds);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari kelas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                >
                    {allSelected ? "Batalkan Semua" : "Pilih Semua"}
                </Button>
            </div>

            <div className="text-sm text-muted-foreground">
                {selectedIds.length} kelas dipilih
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Nama Kelas</TableHead>
                            <TableHead>Tingkat</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClasses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    {searchQuery ? "Tidak ada kelas yang cocok" : "Belum ada data kelas"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClasses.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(cls.id)}
                                            onCheckedChange={() => onToggle(cls.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{cls.name}</TableCell>
                                    <TableCell>Kelas {cls.grade}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
