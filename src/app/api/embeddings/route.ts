import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getEmbedding, cosineSimilarity } from "@/lib/embedding";

// 向量检索 API
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { query, appId, topK = 5, threshold = 0.35 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "查询内容不能为空" }, { status: 400 });
    }

    // 获取查询向量
    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding) {
      return NextResponse.json({ error: "生成查询向量失败，请确保已配置智谱 AI 的 ZHIPU_API_KEY" }, { status: 500 });
    }

    // 构建查询条件
    let whereClause: any = { embedding: { not: null } };
    if (appId) {
      whereClause.document = {
        userId: userId || undefined,
        apps: { some: { appId } },
      };
    } else {
      whereClause.document = { userId: userId || undefined };
    }

    // 获取所有带向量的分块
    const chunks = await prisma.documentChunk.findMany({
      where: whereClause,
      include: {
        document: {
          select: { id: true, originalName: true, type: true },
        },
      },
    });

    if (chunks.length === 0) {
      return NextResponse.json({
        query,
        results: [],
        total: 0,
        message: appId ? "该智能体未关联任何已向量化的文档" : "暂无已向量化的文档",
      });
    }

    // 计算相似度并排序
    const results = chunks
      .map((chunk) => {
        try {
          const embedding = JSON.parse(chunk.embedding as string);
          const similarity = cosineSimilarity(queryEmbedding.embedding, embedding);
          return {
            chunkId: chunk.id,
            content: chunk.content,
            similarity,
            document: chunk.document,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
          };
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null && item.similarity >= threshold)
      .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
      .slice(0, topK);

    return NextResponse.json({
      query,
      results,
      total: results.length,
      queryVectorDim: queryEmbedding.embedding.length,
    });
  } catch (error) {
    console.error("检索失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "检索失败" },
      { status: 500 }
    );
  }
}