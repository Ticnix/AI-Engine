import type { Metadata } from "next";
import "./globals.css";
import { AntdProvider } from "@/components/antd-provider";

export const metadata: Metadata = {
  title: "AI Engine",
  description: "AI Engine Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <body className="min-h-full flex flex-col">
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
