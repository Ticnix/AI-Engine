import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// 获取单个智能体详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const app = await prisma.app.findUnique({
      where: { id, userId: userId || undefined },
      include: {
        chats: {
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { chats: true },
        },
        documents: {
          include: {
            document: {
              select: { id: true, originalName: true, type: true, status: true },
            },
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: "智能体不存在" }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error) {
    console.error("获取智能体详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新智能体
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, prompt, model, documentIds, workflowId } = body;

    const userId = await getCurrentUserId();

    // 检查所有权
    const existing = await prisma.app.findUnique({
      where: { id, userId: userId || undefined },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    console.log("PUT /api/apps/:id - 请求体:", { name, documentIds, documentIdsLength: documentIds?.length });

    if (!name) {
      return NextResponse.json({ error: "名称是必填项" }, { status: 400 });
    }

    // 更新智能体基本信息
    await prisma.app.update({
      where: { id },
      data: {
        name,
        description: description || null,
        prompt: prompt || null,
        model: model || null,
        workflowId: workflowId || null,
      },
    });

    // 如果提供了 documentIds，更新文档关联
    if (documentIds !== undefined && Array.isArray(documentIds)) {
      await prisma.appDocument.deleteMany({ where: { appId: id } });

      if (documentIds.length > 0) {
        await prisma.appDocument.createMany({
          data: documentIds.map((docId: string) => ({
            appId: id,
            documentId: docId,
          })),
        });
      }
    }

    const updatedApp = await prisma.app.findUnique({
      where: { id },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, originalName: true, type: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error("更新智能体失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除智能体
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    // 检查所有权
    const existing = await prisma.app.findUnique({
      where: { id, userId: userId || undefined },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    await prisma.app.delete({ where: { id } });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除智能体失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
