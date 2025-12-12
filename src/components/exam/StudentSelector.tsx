"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Student {
    id: string;
    name: string;
    username: string;
    classes: Array<{ id: string; name: string }>;
}

interface StudentSelectorProps {
    students: Student[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
}

export function StudentSelector({ students, selectedIds, onToggle, onSelectAll }: StudentSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [classFilter, setClassFilter] = useState<string>("all");

    // Get unique classes from all students
    const availableClasses = useMemo(() => {
        const classMap = new Map<string, string>();
        students.forEach(student => {
            student.classes.forEach(cls => {
                classMap.set(cls.id, cls.name);
            });
        });
        return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
    }, [students]);

    // Filter students by search and class
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch =
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.username.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesClass = classFilter === "all" ||
                student.classes.some(cls => cls.id === classFilter);

            return matchesSearch && matchesClass;
        });
    }, [students, searchQuery, classFilter]);

    // Check if all filtered students are selected
    const allSelected = filteredStudents.length > 0 &&
        filteredStudents.every(student => selectedIds.includes(student.id));

    const handleSelectAll = () => {
        if (allSelected) {
            // Deselect all filtered
            const idsToRemove = new Set(filteredStudents.map(s => s.id));
            onSelectAll(selectedIds.filter(id => !idsToRemove.has(id)));
        } else {
            // Select all filtered
            const newIds = [...selectedIds];
            filteredStudents.forEach(student => {
                if (!newIds.includes(student.id)) {
                    newIds.push(student.id);
                }
            });
            onSelectAll(newIds);
        }
    };

    const getStudentClassNames = (student: Student) => {
        if (student.classes.length === 0) return "-";
        return student.classes.map(c => c.name).join(", ");
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama atau username siswa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {availableClasses.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                {selectedIds.length} siswa dipilih
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Nama Siswa</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Kelas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    {searchQuery || classFilter !== "all"
                                        ? "Tidak ada siswa yang cocok"
                                        : "Belum ada data siswa"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(student.id)}
                                            onCheckedChange={() => onToggle(student.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{student.username}</TableCell>
                                    <TableCell className="text-sm">{getStudentClassNames(student)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
