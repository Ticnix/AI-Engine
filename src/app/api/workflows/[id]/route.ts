import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 获取工作流详情
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId: userId || undefined },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("获取工作流详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT: 更新工作流
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let userId: string | null = null;
    try {
      userId = await getCurrentUserId();
    } catch {
      // ignore
    }
    const body = await request.json();

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
    }

    // 权限检查
    if (existing.userId && existing.userId !== userId) {
      return NextResponse.json({ error: "无权修改" }, { status: 403 });
    }

    const { name, description, nodes, edges, status } = body;

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        nodes: nodes !== undefined ? (nodes as any) : undefined,
        edges: edges !== undefined ? (edges as any) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("更新工作流失败:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `更新失败: ${msg}` }, { status: 500 });
  }
}

// DELETE: 删除工作流
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let userId: string | null = null;
    try {
      userId = await getCurrentUserId();
    } catch {
      // ignore
    }
    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 });
    }

    if (existing.userId && existing.userId !== userId) {
      return NextResponse.json({ error: "无权删除" }, { status: 403 });
    }

    await prisma.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除工作流失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
