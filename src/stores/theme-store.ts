import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      toggleTheme: () =>
        set((state) => ({
          mode: state.mode === "dark" ? "light" : "dark",
        })),
      setTheme: (mode) => set({ mode }),
    }),
    {
      name: "theme-storage",
      version: 1,
      // v1: 默认主题改为日光模式（迁移时重置为 light）
      migrate: () => ({ mode: "light" as ThemeMode }),
    }
  )
);
