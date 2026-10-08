import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { parseDocumentData } from "@/lib/document-parser";

// 支持的文件类型
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "md", // .md 文件可能被识别为 text/plain
};

// 文件大小限制 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// GET: 获取文档列表（当前用户的文档）
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const documents = await prisma.document.findMany({
      where: { userId: userId || undefined },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        type: true,
        size: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("获取文档列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST: 上传文档（文件内容存入数据库，适配 Serverless 环境）
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // 验证文件类型
    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "pdf" && ext !== "md" && ext !== "markdown") {
        return NextResponse.json(
          { error: "仅支持 PDF 和 Markdown 文件" },
          { status: 400 }
        );
      }
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // 确定文件类型
    const actualType = fileType || (file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "md");

    // 生成唯一文件名
    const ext = actualType === "pdf" ? ".pdf" : ".md";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    // 读取文件内容并以 base64 存入数据库
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileDataBase64 = buffer.toString("base64");

    // 创建数据库记录
    const document = await prisma.document.create({
      data: {
        name: uniqueName,
        originalName: file.name,
        type: actualType,
        size: file.size,
        fileData: fileDataBase64,
        status: "pending",
        userId: userId || undefined,
      },
    });

    // 同步解析文档内容（Serverless 环境中后台任务可能被终止，因此不使用 fire-and-forget）
    await parseDocument(document.id);

    const updated = await prisma.document.findUnique({
      where: { id: document.id },
      select: {
        id: true,
        name: true,
        originalName: true,
        type: true,
        size: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("上传文档失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

// 解析文档：从数据库中的原始文件内容解析文本并保存
async function parseDocument(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return;

  await prisma.document.update({
    where: { id },
    data: { status: "processing" },
  });

  try {
    if (!document.fileData) {
      throw new Error("文档内容缺失");
    }

    const content = await parseDocumentData(document.type, document.fileData);

    if (!content || content.trim().length === 0) {
      throw new Error("文档内容为空");
    }

    await prisma.document.update({
      where: { id },
      data: { content, status: "completed" },
    });
  } catch (parseError) {
    await prisma.document.update({
      where: { id },
      data: {
        status: "error",
        error: parseError instanceof Error ? parseError.message : "解析失败",
      },
    });
  }
}
