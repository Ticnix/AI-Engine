import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// 文件存储目录
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents");

// 支持的文件类型
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "md", // .md 文件可能被识别为 text/plain
};

// 文件大小限制 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 确保上传目录存在
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// PDF 解析函数
async function parsePdf(filePath: string): Promise<string> {
  const pdfParseModule = await import("pdf-parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const { readFile } = await import("fs/promises");
  const dataBuffer = await readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

// Markdown 解析函数
async function parseMarkdown(filePath: string): Promise<string> {
  const { readFile } = await import("fs/promises");
  const content = await readFile(filePath, "utf-8");
  return content;
}

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

// POST: 上传文档
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

    // 确保目录存在
    await ensureUploadDir();

    // 保存文件
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 创建数据库记录
    const document = await prisma.document.create({
      data: {
        name: uniqueName,
        originalName: file.name,
        type: actualType,
        size: file.size,
        path: filePath,
        status: "pending",
        userId: userId || undefined,
      },
    });

    // 自动触发解析（不阻塞上传响应）
    parseDocument(document.id).catch((err) =>
      console.error("自动解析失败:", err)
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("上传文档失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

// 后台解析文档
async function parseDocument(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return;

  await prisma.document.update({
    where: { id },
    data: { status: "processing" },
  });

  try {
    let content: string;
    if (document.type === "pdf") {
      content = await parsePdf(document.path);
    } else {
      content = await parseMarkdown(document.path);
    }

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