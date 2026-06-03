import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// 获取某个对话的所有消息
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    // 验证对话属于当前用户
    const chat = await prisma.chat.findFirst({
      where: { id, app: { userId: userId || undefined } },
      select: { id: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("获取消息失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
