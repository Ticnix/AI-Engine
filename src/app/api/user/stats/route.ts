import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取当前登录用户的统计数据
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // 如果已登录，统计该用户的数据
    if (currentUser) {
      const [apps, workflows] = await Promise.all([
        prisma.app.count({ where: { userId: currentUser.id } }),
        prisma.workflow.count({ where: { userId: currentUser.id } }),
      ]);

      // 统计该用户的对话（通过 app 关联）
      const appIds = await prisma.app.findMany({
        where: { userId: currentUser.id },
        select: { id: true },
      });
      const chats = await prisma.chat.count({
        where: { appId: { in: appIds.map((a) => a.id) } },
      });

      // 统计该用户的文档
      const docs = await prisma.document.count({
        where: { userId: currentUser.id },
      });

      return NextResponse.json({ apps, chats, docs, workflows });
    }

    // 如果未登录，返回全局统计数据
    const [apps, chats, docs, workflows] = await Promise.all([
      prisma.app.count(),
      prisma.chat.count(),
      prisma.document.count({ where: { userId: null } }),
      prisma.workflow.count(),
    ]);

    return NextResponse.json({ apps, chats, docs, workflows });
  } catch (error) {
    console.error("获取用户统计失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
