"use client";

import { useTransition, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-store";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    value?: string;
    onChange: (url?: string) => void;
    className?: string;
    disabled?: boolean;
    endpoint?: string;
    accept?: string;
}

export function FileUpload({
    value,
    onChange,
    className,
    disabled,
    endpoint = "/api/upload",
    accept = "image/*"
}: FileUploadProps) {
    const [isPending, startTransition] = useTransition();
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(endpoint, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error("Upload failed");
                }

                const data = await res.json();
                onChange(data.url);
                toast({ title: "Success", description: "File uploaded successfully", variant: "success" });
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
            }
        });
    };

    if (value) {
        return (
            <div className={cn("relative flex items-center justify-center w-full max-w-[200px] aspect-video border rounded-lg overflow-hidden bg-muted", className)}>
                <div className="relative w-full h-full">
                    <Image
                        src={value}
                        alt="Upload"
                        fill
                        className="object-contain"
                    />
                </div>
                <Button
                    onClick={() => onChange(undefined)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
                    variant="destructive"
                    type="button"
                    disabled={disabled || isPending}
                >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full max-w-[400px] min-h-[150px] border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition cursor-pointer",
                isDragOver ? "border-primary bg-muted/50" : "border-muted-foreground/25",
                (disabled || isPending) && "opacity-50 cursor-not-allowed pointer-events-none",
                className
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
                document.getElementById('file-upload-input')?.click();
            }}
        >
            <input
                id="file-upload-input"
                type="file"
                accept={accept}
                className="hidden"
                disabled={disabled || isPending}
                onChange={handleFileChange}
            />

            <div className="flex flex-col items-center justify-center space-y-2 text-center text-sm text-muted-foreground">
                {isPending ? (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Uploading...</p>
                    </>
                ) : (
                    <>
                        <UploadCloud className="h-8 w-8" />
                        <p className="font-medium">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs">
                            SVG, PNG, JPG or GIF
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
