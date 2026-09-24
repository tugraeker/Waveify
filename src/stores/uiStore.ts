import { create } from 'zustand';

export interface UiToast {
  id: number;
  msg: string;
}

interface UiState {
  toasts: UiToast[];
  toast: (msg: string) => void;
  dismissToast: (id: number) => void;
}

let nextToastId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  toast: (msg) => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
