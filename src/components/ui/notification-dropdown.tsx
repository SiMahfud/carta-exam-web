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

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
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

    const markAllAsRead = () => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
                                onClick={() => setOpen(false)}
                                className="block"
                            >
                                <DropdownMenuItem className="p-2.5 cursor-pointer rounded-md hover:bg-muted/70 flex items-start gap-2.5">
                                    <div className="mt-0.5 shrink-0 bg-muted p-1.5 rounded-full">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {item.title}
                                        </p>
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
