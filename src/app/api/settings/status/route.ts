import { NextResponse } from "next/server";
import { checkOllamaStatus } from "@/lib/ollama";
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

    const [ollamaStatus, stats] = await Promise.all([
      checkOllamaStatus(),
      {
        apps: await prisma.app.count({ where: { userId: userId || undefined } }),
        chats: await prisma.chat.count({ where: { appId: appIds.length > 0 ? { in: appIds } : undefined } }),
        docs: await prisma.document.count({ where: { userId: userId || undefined } }),
        workflows: await prisma.workflow.count({ where: { userId: userId || undefined } }),
        executions: await prisma.workflowExecution.count({
          where: { workflow: { userId: userId || undefined } },
        }),
      },
    ]);

    return NextResponse.json({
      ollama: {
        running: ollamaStatus.running,
        url: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        defaultModel: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        models: ollamaStatus.models,
      },
      stats,
    });
  } catch (error) {
    console.error("获取系统信息失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
