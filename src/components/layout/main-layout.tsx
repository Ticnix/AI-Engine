"use client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useRef } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { checkAuth } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      checkAuth();
    }
  }, [checkAuth]);

  return (
    <div className="main-layout">
      <Header />

      <div className="layout-body">
        <Sidebar />

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
