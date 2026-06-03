import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { unlink, readFile } from "fs/promises";
import { existsSync } from "fs";

// PDF 解析函数
async function parsePdf(filePath: string): Promise<string> {
  // 动态导入 pdf-parse，处理 ESM 兼容性
  const pdfParseModule = await import("pdf-parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const dataBuffer = await readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

// Markdown 解析函数
async function parseMarkdown(filePath: string): Promise<string> {
  const content = await readFile(filePath, "utf-8");
  return content;
}

// GET: 获取文档详情（包含内容）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const document = await prisma.document.findFirst({
      where: { id, userId: userId || undefined },
    });

    if (!document) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }

    // 如果内容未解析，尝试解析
    if (!document.content && document.status === "pending") {
      try {
        // 更新状态为处理中
        await prisma.document.update({
          where: { id },
          data: { status: "processing" },
        });

        // 解析文件内容
        let content: string;
        if (document.type === "pdf") {
          content = await parsePdf(document.path);
        } else {
          content = await parseMarkdown(document.path);
        }

        // 更新内容和状态
        const updated = await prisma.document.update({
          where: { id },
          data: {
            content,
            status: "completed",
          },
        });

        return NextResponse.json(updated);
      } catch (parseError) {
        // 更新错误状态
        await prisma.document.update({
          where: { id },
          data: {
            status: "error",
            error: parseError instanceof Error ? parseError.message : "解析失败",
          },
        });

        return NextResponse.json(
          { error: "文件解析失败" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("获取文档详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// DELETE: 删除文档
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const document = await prisma.document.findFirst({
      where: { id, userId: userId || undefined },
    });

    if (!document) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }

    // 删除物理文件
    if (existsSync(document.path)) {
      await unlink(document.path);
    }

    // 删除数据库记录
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除文档失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}