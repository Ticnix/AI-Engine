// 智谱 AI 向量嵌入服务
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
const EMBEDDING_MODEL = process.env.ZHIPU_EMBEDDING_MODEL || "embedding-3";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

/**
 * 调用智谱 Embedding API 获取文本向量
 * 使用 embedding-3 模型（2048 维向量）
 */
export async function getEmbedding(text: string): Promise<EmbeddingResult | null> {
  try {
    if (!ZHIPU_API_KEY) {
      console.error("Embedding API error: 未配置智谱 API Key（ZHIPU_API_KEY）");
      return null;
    }

    const response = await fetch(`${ZHIPU_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return null;
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) {
      console.error("Embedding API error: 响应中缺少向量数据");
      return null;
    }

    return {
      embedding: embedding as number[],
      tokenCount: Math.ceil(text.length / 4), // 估算
    };
  } catch (error) {
    console.error("Failed to get embedding:", error);
    return null;
  }
}

/**
 * 批量获取向量嵌入
 */
export async function getEmbeddings(texts: string[]): Promise<(EmbeddingResult | null)[]> {
  return Promise.all(texts.map(getEmbedding));
}

/**
 * 计算余弦相似度
 * 用于比较两个向量的相似程度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * 检查 embedding 服务是否可用（检查 API Key 是否已配置）
 */
export async function checkEmbeddingModel(): Promise<boolean> {
  return Boolean(ZHIPU_API_KEY);
}
