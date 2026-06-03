"use client";

import { App as AntApp } from "antd";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return <AntApp>{children}</AntApp>;
}