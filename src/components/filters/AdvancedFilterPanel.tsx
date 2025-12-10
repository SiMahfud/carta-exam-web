"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdvancedFilterPanelProps {
    children: ReactNode;
    activeFiltersCount: number;
    onReset: () => void;
    onApply: () => void;
}

export function AdvancedFilterPanel({
    children,
    activeFiltersCount,
    onReset,
    onApply
}: AdvancedFilterPanelProps) {
    const [open, setOpen] = useState(false);

    const handleApply = () => {
        onApply();
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="ml-2 h-5 min-w-[20px] px-1 rounded-full text-xs flex items-center justify-center bg-primary/10 text-primary"
                        >
                            {activeFiltersCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Filter Lanjutan</SheetTitle>
                    <SheetDescription>
                        Sesuaikan pencarian Anda dengan kriteria yang lebih spesifik.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {children}
                </div>

                <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background flex-row gap-2 justify-between">
                    <Button
                        variant="outline"
                        onClick={onReset}
                        className="flex-1"
                    >
                        <X className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button
                        onClick={handleApply}
                        className="flex-1"
                    >
                        Terapkan Filter
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Reusable filter section wrapper
export function FilterSection({
    title,
    children
}: {
    title: string;
    children: ReactNode
}) {
    return (
        <div className="space-y-3">
            <h4 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {title}
            </h4>
            {children}
        </div>
    );
}
