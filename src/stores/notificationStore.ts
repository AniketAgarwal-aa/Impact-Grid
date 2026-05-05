import { create } from "zustand";

export interface NotificationItem {
  id: number;
  title?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
  [k: string]: unknown;
}

interface NotificationState {
  count: number;
  items: NotificationItem[];
  setCount: (n: number) => void;
  increment: () => void;
  reset: () => void;
  setItems: (items: NotificationItem[]) => void;
  markReadLocal: (id: number) => void;
  removeLocal: (id: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  count: 0,
  items: [],
  setCount: (n) => set({ count: n }),
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
  setItems: (items) =>
    set({
      items,
      count: items.filter((n) => !n.is_read).length,
    }),
  markReadLocal: (id) =>
    set((s) => {
      const next = s.items.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      );
      return { items: next, count: next.filter((n) => !n.is_read).length };
    }),
  removeLocal: (id) =>
    set((s) => {
      const next = s.items.filter((n) => n.id !== id);
      return { items: next, count: next.filter((n) => !n.is_read).length };
    }),
}));
