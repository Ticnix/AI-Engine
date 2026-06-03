import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// 获取单个对话详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    // 获取对话并验证所属智能体属于当前用户
    const chat = await prisma.chat.findFirst({
      where: {
        id,
        app: { userId: userId || undefined },
      },
      include: {
        app: {
          select: { id: true, name: true, model: true, prompt: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("获取对话详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 删除对话
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const chat = await prisma.chat.findFirst({
      where: {
        id,
        app: { userId: userId || undefined },
      },
      select: { id: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    await prisma.chat.delete({ where: { id } });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除对话失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
