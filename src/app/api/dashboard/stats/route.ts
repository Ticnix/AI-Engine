import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    // 获取当前用户的智能体ID
    const apps = await prisma.app.findMany({
      where: { userId: userId || undefined },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);

    const [
      appsCount,
      chatsCount,
      docsCount,
      flowsCount,
      recentChats,
      recentApps,
      recentWorkflows,
    ] = await Promise.all([
      prisma.app.count({ where: { userId: userId || undefined } }),
      prisma.chat.count({ where: { appId: appIds.length > 0 ? { in: appIds } : undefined } }),
      prisma.document.count({ where: { userId: userId || undefined } }),
      prisma.workflow.count({ where: { userId: userId || undefined } }),
      // 最近对话
      prisma.chat.findMany({
        where: { appId: appIds.length > 0 ? { in: appIds } : undefined },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { app: { select: { name: true } } },
      }),
      // 最近智能体
      prisma.app.findMany({
        where: { userId: userId || undefined },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
      // 最近工作流
      prisma.workflow.findMany({
        where: { userId: userId || undefined },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
    ]);

    // 合并所有最近活动，按时间排序
    const activities: Array<{
      id: string;
      type: string;
      name: string;
      action: string;
      time: string;
      colorClass: string;
    }> = [];

    recentChats.forEach((c) =>
      activities.push({
        id: c.id,
        type: "chat",
        name: c.title,
        action: "发起对话",
        time: c.createdAt.toISOString(),
        colorClass: "color-green",
      })
    );

    recentApps.forEach((a) =>
      activities.push({
        id: a.id,
        type: "app",
        name: a.name,
        action: "创建智能体",
        time: a.createdAt.toISOString(),
        colorClass: "color-blue",
      })
    );

    recentWorkflows.forEach((w) =>
      activities.push({
        id: w.id,
        type: "flow",
        name: w.name,
        action: w.status === "published" ? "发布工作流" : "创建工作流",
        time: w.createdAt.toISOString(),
        colorClass: "color-orange",
      })
    );

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      stats: {
        apps: appsCount,
        chats: chatsCount,
        docs: docsCount,
        flows: flowsCount,
      },
      activities: activities.slice(0, 10),
    });
  } catch (error) {
    console.error("获取仪表盘数据失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
