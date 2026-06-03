import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; execId: string }>;
}

// GET: 获取执行详情
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, execId } = await params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: execId },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!execution || execution.workflowId !== id) {
      return NextResponse.json({ error: "执行记录不存在" }, { status: 404 });
    }

    return NextResponse.json(execution);
  } catch (error) {
    console.error("获取执行详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
