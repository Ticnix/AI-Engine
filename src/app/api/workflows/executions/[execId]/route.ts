import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ execId: string }>;
}

// POST: 取消正在执行的工作流
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { execId } = await params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: execId },
    });

    if (!execution) {
      return NextResponse.json({ error: "执行记录不存在" }, { status: 404 });
    }

    if (execution.status !== "running") {
      return NextResponse.json({ error: "工作流已结束" }, { status: 400 });
    }

    await prisma.workflowExecution.update({
      where: { id: execId },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    // TODO: 如果需要支持真正的中断执行, 需要使用 AbortController
    // 当前版本只更新状态, 执行引擎会在下次检查时停止

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("取消执行失败:", error);
    return NextResponse.json({ error: "取消失败" }, { status: 500 });
  }
}
