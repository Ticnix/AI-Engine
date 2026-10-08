import { NextResponse } from "next/server";
import { checkZhipuStatus } from "@/lib/zhipu";
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

    const zhipuStatus = checkZhipuStatus();

    const stats = {
      apps: await prisma.app.count({ where: { userId: userId || undefined } }),
      chats: await prisma.chat.count({ where: { appId: appIds.length > 0 ? { in: appIds } : undefined } }),
      docs: await prisma.document.count({ where: { userId: userId || undefined } }),
      workflows: await prisma.workflow.count({ where: { userId: userId || undefined } }),
      executions: await prisma.workflowExecution.count({
        where: { workflow: { userId: userId || undefined } },
      }),
    };

    return NextResponse.json({
      zhipu: {
        running: zhipuStatus.running,
        baseUrl: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
        defaultModel: process.env.ZHIPU_MODEL || "glm-4.5-flash",
        models: zhipuStatus.models,
      },
      stats,
    });
  } catch (error) {
    console.error("获取系统信息失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
