import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { chunkText } from "@/lib/chunking";
import { getEmbedding } from "@/lib/embedding";
import { parseDocumentData } from "@/lib/document-parser";

// 处理文档：分块 + 向量化
export async function POST(
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

    // 更新状态为处理中
    await prisma.document.update({
      where: { id },
      data: { status: "processing" },
    });

    try {
      // 1. 获取文档内容（优先使用已解析文本，否则从数据库中的原始文件解析）
      let content = document.content;

      if (!content) {
        if (!document.fileData) {
          throw new Error("文档内容缺失，请重新上传");
        }

        content = await parseDocumentData(document.type, document.fileData);

        // 保存解析后的内容
        await prisma.document.update({
          where: { id },
          data: { content },
        });
      }

      if (!content || content.trim().length === 0) {
        throw new Error("文档内容为空");
      }

      // 2. 分块处理
      const chunks = chunkText(content);

      if (chunks.length === 0) {
        throw new Error("文档分块失败");
      }

      // 3. 删除旧分块
      await prisma.documentChunk.deleteMany({
        where: { documentId: id },
      });

      // 4. 向量化并保存
      let processedCount = 0;
      let failedCount = 0;

      for (const chunk of chunks) {
        try {
          const embeddingResult = await getEmbedding(chunk.content);

          await prisma.documentChunk.create({
            data: {
              documentId: id,
              chunkIndex: chunk.index,
              content: chunk.content,
              embedding: embeddingResult ? JSON.stringify(embeddingResult.embedding) : null,
              tokenCount: chunk.tokenCount,
            },
          });

          processedCount++;
        } catch {
          // 向量化失败，保存不带向量的分块
          await prisma.documentChunk.create({
            data: {
              documentId: id,
              chunkIndex: chunk.index,
              content: chunk.content,
              embedding: null,
              tokenCount: chunk.tokenCount,
            },
          });
          failedCount++;
        }
      }

      // 更新状态为完成
      await prisma.document.update({
        where: { id },
        data: {
          status: "embedding",
          error: failedCount > 0 ? `${failedCount} 个分块向量化失败` : null,
        },
      });

      return NextResponse.json({
        message: "文档处理完成",
        documentId: id,
        totalChunks: chunks.length,
        processedChunks: processedCount,
        failedChunks: failedCount,
      });
    } catch (processError) {
      await prisma.document.update({
        where: { id },
        data: {
          status: "error",
          error: processError instanceof Error ? processError.message : "处理失败",
        },
      });
      throw processError;
    }
  } catch (error) {
    console.error("处理文档失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}
