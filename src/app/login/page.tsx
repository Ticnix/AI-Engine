import { AuthCard } from "@/components/auth/auth-card";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <ThemeProvider>
      <main className="auth-page flex min-h-screen flex-col items-center justify-center p-4">
        {/* 光斑动态效果 */}
        <div className="light-spot light-spot-1" />
        <div className="light-spot light-spot-2" />
        <div className="light-spot light-spot-3" />
        <div className="light-spot light-spot-4" />
        <div className="light-spot light-spot-5" />

        <Suspense>
          <AuthCard />
        </Suspense>
      </main>
    </ThemeProvider>
  );
}
