"use client";

import { useEffect, useLayoutEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";

// 使用 useLayoutEffect 确保在渲染前设置主题，避免闪烁
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((state) => state.mode);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;

    // 移除所有主题类
    root.classList.remove("light-mode", "dark-mode");

    // 添加当前主题类（light 模式才添加类，dark 使用默认样式）
    if (mode === "light") {
      root.classList.add("light-mode");
    }

    // 同时设置 data 属性，便于调试
    root.setAttribute("data-theme", mode);
  }, [mode]);

  return <>{children}</>;
}