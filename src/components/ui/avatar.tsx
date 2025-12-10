"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
        )}
        {...props}
    />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
    HTMLImageElement,
    Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> & { src?: string | null; alt?: string }
>(({ className, src, alt = "Avatar", ...props }, ref) => {
    if (!src) return null;
    return (
        <Image
            ref={ref}
            src={src}
            alt={alt}
            className={cn("aspect-square h-full w-full", className)}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            {...props}
        />
    )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-muted",
            className
        )}
        {...props}
    />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
