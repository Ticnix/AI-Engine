// Retrieval 节点: 知识库向量检索
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";
import { prisma } from "../../prisma";
import { getEmbedding, cosineSimilarity } from "../../embedding";

interface RetrievalConfig {
  query?: string;
  topK?: number;
  threshold?: number;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as RetrievalConfig) || {};

    // 解析查询变量, 默认为空字符串
    const query = config.query
      ? resolveVariablesInString(config.query, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    const topK = (config.topK as number) || 5;
    const threshold = (config.threshold as number) || 0.3;

    // 获取查询向量
    const embeddingResult = await getEmbedding(query);
    if (!embeddingResult) {
      return { success: false, error: "无法生成查询向量" };
    }

    // 获取所有已完成向量化文档的分块
    const chunks = await prisma.documentChunk.findMany({
      where: {
        embedding: { not: null },
        document: { status: "embedding" },
      },
      include: { document: true },
    });

    // 计算相似度并排序
    const queryEmbedding = embeddingResult.embedding;
    const scored = chunks
      .map((chunk) => {
        const storedEmbedding = JSON.parse(chunk.embedding!) as number[];
        const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
        return { chunk, similarity };
      })
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return {
      success: true,
      data: {
        query,
        chunks: scored.map((item) => ({
          id: item.chunk.id,
          content: item.chunk.content,
          documentName: item.chunk.document.originalName,
          similarity: item.similarity,
        })),
        totalResults: scored.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "检索失败",
    };
  }
}
