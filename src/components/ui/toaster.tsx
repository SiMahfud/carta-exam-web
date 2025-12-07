"use client";

import { useToastStore } from "@/lib/toast-store";
import { Toast } from "./toast";

export function Toaster() {
    const { toasts, dismiss } = useToastStore();

    return (
        <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onDismiss={dismiss} />
            ))}
        </div>
    );
}
