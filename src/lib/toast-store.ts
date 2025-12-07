import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastState {
    toasts: Toast[];
    toast: (props: Omit<Toast, 'id'>) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

let toastCount = 0;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    toast: (props) => {
        const id = `toast-${++toastCount}`;
        const duration = props.duration ?? 4000;

        set((state) => ({
            toasts: [...state.toasts, { ...props, id }],
        }));

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
    },
    dismiss: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
    dismissAll: () => {
        set({ toasts: [] });
    },
}));

// Helper function for use outside React components
export const toast = (props: Omit<Toast, 'id'>) => {
    useToastStore.getState().toast(props);
};
