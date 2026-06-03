import { NextResponse } from "next/server";
import { clearAuthResponse } from "@/lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "已成功登出" });
    clearAuthResponse(response);
    return response;
  } catch (error) {
    console.error("登出失败:", error);
    return NextResponse.json(
      { error: "登出失败" },
      { status: 500 }
    );
  }
}