"use client";

import { useEffect, useLayoutEffect } from "react";

// 使用 useLayoutEffect 确保在渲染前设置主题，避免闪烁
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;

    // 系统仅支持日间模式
    root.classList.remove("dark-mode");
    root.classList.add("light-mode");
    root.setAttribute("data-theme", "light");
  }, []);

  return <>{children}</>;
}
