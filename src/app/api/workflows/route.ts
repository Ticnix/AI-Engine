import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// GET: 获取工作流列表（当前用户的）
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const workflows = await prisma.workflow.findMany({
      where: {
        userId: userId || undefined,
        status: status || undefined,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const workflowsWithNodeCount = await Promise.all(
      workflows.map(async (wf) => {
        const full = await prisma.workflow.findUnique({
          where: { id: wf.id },
          select: { nodes: true },
        });
        const nodes = full?.nodes as unknown[];
        return {
          ...wf,
          nodeCount: Array.isArray(nodes) ? nodes.length : 0,
        };
      })
    );

    return NextResponse.json(workflowsWithNodeCount);
  } catch (error) {
    console.error("获取工作流列表失败:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `获取失败: ${msg}` }, { status: 500 });
  }
}

// POST: 创建工作流
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    const body = await request.json();
    const { name, description, nodes, edges } = body;

    if (!name) {
      return NextResponse.json({ error: "请输入工作流名称" }, { status: 400 });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description: description || null,
        userId: userId || null,
        nodes: (nodes || []) as any,
        edges: (edges || []) as any,
        status: "draft",
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("创建工作流失败:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `创建失败: ${msg}` }, { status: 500 });
  }
}
