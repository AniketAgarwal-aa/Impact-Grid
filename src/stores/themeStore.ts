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
    let initialTheme: "dark" | "light" = "light";
    if (saved === "dark" || saved === "light") {
      initialTheme = saved;
    } else {
      const systemDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      initialTheme = systemDark ? "dark" : "light";
    }
    // Instantly apply theme on first load
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    return initialTheme;
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
