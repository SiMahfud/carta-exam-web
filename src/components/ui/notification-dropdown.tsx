import React, { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Edit3, Info, AlertTriangle, CheckCheck } from "lucide-react";
import Link from "next/link";
import { AppNotification } from "@/app/api/notifications/route";

const STORAGE_PREFIX = "carta_read_notifications_";

function getStoredReadIds(userId?: string): string[] {
    if (typeof window === "undefined") return [];
    try {
        const key = `${STORAGE_PREFIX}${userId || "anonymous"}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function storeReadIds(ids: string[], userId?: string) {
    if (typeof window === "undefined") return;
    try {
        const key = `${STORAGE_PREFIX}${userId || "anonymous"}`;
        const unique = Array.from(new Set(ids)).slice(-100);
        localStorage.setItem(key, JSON.stringify(unique));
    } catch {
        // Ignore localStorage write errors
    }
}

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userId, setUserId] = useState<string>("");
    const [open, setOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                const currentUserId = data.userId || "";
                setUserId(currentUserId);

                const rawList: AppNotification[] = data.notifications || [];
                const readIds = getStoredReadIds(currentUserId);

                const processed = rawList.map((item) => ({
                    ...item,
                    read: readIds.includes(item.id) || !!item.read,
                }));

                setNotifications(processed);
                setUnreadCount(processed.filter((item) => !item.read).length);
            }
        } catch {
            // Ignore background fetch errors
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    const markAllAsRead = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const allIds = notifications.map((n) => n.id);
        const existing = getStoredReadIds(userId);
        const updated = Array.from(new Set([...existing, ...allIds]));
        storeReadIds(updated, userId);

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleItemClick = (item: AppNotification) => {
        setOpen(false);
        if (!item.read) {
            const existing = getStoredReadIds(userId);
            const updated = Array.from(new Set([...existing, item.id]));
            storeReadIds(updated, userId);

            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "exam":
                return <Calendar className="h-4 w-4 text-blue-500" />;
            case "grading":
                return <Edit3 className="h-4 w-4 text-purple-500" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <Info className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0 font-bold text-sm">Notifikasi</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                            <CheckCheck className="h-3 w-3" />
                            Tandai Sudah Dibaca
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />

                <div className="max-h-72 overflow-y-auto space-y-1">
                    {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            Tidak ada notifikasi baru saat ini.
                        </div>
                    ) : (
                        notifications.map((item) => (
                            <Link
                                key={item.id}
                                href={item.link || "#"}
                                onClick={() => handleItemClick(item)}
                                className="block"
                            >
                                <DropdownMenuItem className={`p-2.5 cursor-pointer rounded-md transition-colors flex items-start gap-2.5 ${!item.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/70 opacity-80"}`}>
                                    <div className="mt-0.5 shrink-0 bg-muted p-1.5 rounded-full">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs truncate ${!item.read ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                                                {item.title}
                                            </p>
                                            {!item.read && (
                                                <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                            {item.description}
                                        </p>
                                    </div>
                                </DropdownMenuItem>
                            </Link>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
