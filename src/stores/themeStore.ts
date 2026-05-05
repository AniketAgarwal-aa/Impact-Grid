import { create } from "zustand";

interface ThemeState {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (() => {
    const saved = localStorage.getItem("impactsensei-theme") as
      | "dark"
      | "light"
      | null;
    if (saved === "dark" || saved === "light") return saved;
    const systemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return systemDark ? "dark" : "light";
  })(),
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("impactsensei-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    set({ theme: next });
  },
  setTheme: (t) => {
    localStorage.setItem("impactsensei-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    set({ theme: t });
  },
}));
