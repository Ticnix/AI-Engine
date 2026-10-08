import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// 获取智能体列表（仅当前用户的）
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const apps = await prisma.app.findMany({
      where: { userId: userId || undefined },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chats: true },
        },
      },
    });
    return NextResponse.json(apps);
  } catch (error) {
    console.error("获取智能体列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建智能体
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, model, prompt, documentIds, workflowId } = body;

    const userId = await getCurrentUserId();

    console.log("创建智能体请求:", { name, documentIds, documentIdsLength: documentIds?.length });

    if (!name) {
      return NextResponse.json({ error: "名称是必填项" }, { status: 400 });
    }

    const app = await prisma.app.create({
      data: {
        name,
        description: description || null,
        model: model || "glm-4.5-flash",
        prompt: prompt || null,
        workflowId: workflowId || null,
        userId: userId || null,
        // 如果有文档ID，创建关联
        documents: documentIds?.length > 0
          ? {
              create: documentIds.map((docId: string) => ({
                documentId: docId,
              })),
            }
          : undefined,
      },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, originalName: true },
            },
          },
        },
      },
    });

    console.log("创建结果 - 关联数量:", app.documents?.length);

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    console.error("创建智能体失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
