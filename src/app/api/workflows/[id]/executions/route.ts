import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 获取执行历史列表
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    // 验证工作流属于当前用户
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId: userId || undefined },
      select: { id: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: "desc" },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
      },
      take: 50,
    });

    return NextResponse.json(executions);
  } catch (error) {
    console.error("获取执行历史失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
