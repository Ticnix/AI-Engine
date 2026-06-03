import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// 获取对话列表（仅当前用户的）
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId");

    // 获取当前用户的智能体ID
    const apps = await prisma.app.findMany({
      where: { userId: userId || undefined },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);

    const where: Record<string, unknown> = {
      appId: appId ? appId : { in: appIds },
    };

    const chats = await prisma.chat.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        app: {
          select: { id: true, name: true, model: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      tokens: chat.tokens,
      appId: chat.appId,
      appName: chat.app?.name || "未知应用",
      messageCount: chat._count?.messages || 0,
      createdAt: chat.createdAt,
    }));

    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error("获取对话列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
