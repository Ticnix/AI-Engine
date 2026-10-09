import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// 主题已固定为日间模式，保留接口以兼容旧调用
export const useThemeStore = create<ThemeState>()(() => ({
  mode: "light",
  toggleTheme: () => {},
  setTheme: () => {},
}));
