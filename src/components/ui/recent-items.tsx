"use client";

import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Clock,
    FileText,
    HelpCircle,
    Calendar,
    Database,
    FileCode,
} from "lucide-react";
import { useRecentItems, RecentItem, typeLabels } from "@/hooks/use-recent-items";
import { cn } from "@/lib/utils";

const typeIcons: Record<RecentItem["type"], typeof FileText> = {
    exam: FileText,
    question: HelpCircle,
    session: Calendar,
    bank: Database,
    template: FileCode,
};

interface RecentItemsDropdownProps {
    className?: string;
}

export function RecentItemsDropdown({ className }: RecentItemsDropdownProps) {
    const router = useRouter();
    const { items, groupedItems, clearRecentItems } = useRecentItems();

    if (items.length === 0) {
        return null;
    }

    const handleClick = (href: string) => {
        router.push(href);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-2", className)}
                >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Terakhir</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Item Terakhir</span>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            clearRecentItems();
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive"
                    >
                        Hapus semua
                    </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {Object.entries(groupedItems).map(([type, typeItems]) => {
                    const Icon = typeIcons[type as RecentItem["type"]];
                    const label = typeLabels[type as RecentItem["type"]];

                    if (typeItems.length === 0) return null;

                    return (
                        <div key={type}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Icon className="h-3 w-3" />
                                {label}
                            </div>
                            {typeItems.slice(0, 3).map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => handleClick(item.href)}
                                    className="cursor-pointer"
                                >
                                    <span className="truncate">{item.title}</span>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
