"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBreadcrumbs, BreadcrumbSegment } from "@/lib/breadcrumb-config";

interface BreadcrumbsProps {
    /** Custom breadcrumb items to override auto-generated */
    items?: BreadcrumbSegment[];
    /** Replace the last segment label */
    currentLabel?: string;
    /** Additional CSS classes */
    className?: string;
    /** Show home icon for first item */
    showHomeIcon?: boolean;
}

export function Breadcrumbs({
    items,
    currentLabel,
    className,
    showHomeIcon = true,
}: BreadcrumbsProps) {
    const pathname = usePathname();

    // Use provided items or generate from pathname
    const breadcrumbs = items || generateBreadcrumbs(pathname);

    // Don't show breadcrumbs for root admin page
    if (breadcrumbs.length <= 1) {
        return null;
    }

    // Update last item label if currentLabel is provided
    if (currentLabel && breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1] = {
            ...breadcrumbs[breadcrumbs.length - 1],
            label: currentLabel,
        };
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}
        >
            <ol className="flex items-center gap-1.5 flex-wrap">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isFirst = index === 0;

                    return (
                        <li key={crumb.href} className="flex items-center gap-1.5">
                            {index > 0 && (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            {isLast ? (
                                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.href}
                                    className={cn(
                                        "hover:text-primary transition-colors flex items-center gap-1",
                                        isFirst && showHomeIcon && "gap-1.5"
                                    )}
                                >
                                    {isFirst && showHomeIcon && (
                                        <Home className="h-3.5 w-3.5" />
                                    )}
                                    <span className="truncate max-w-[150px]">{crumb.label}</span>
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
