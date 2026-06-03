// Ollama 向量嵌入服务
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

/**
 * 调用 Ollama Embedding API 获取文本向量
 * 使用 nomic-embed-text 模型（768 维向量）
 */
export async function getEmbedding(text: string): Promise<EmbeddingResult | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      embedding: data.embedding as number[],
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
 * 检查 Ollama embedding 模型是否可用
 */
export async function checkEmbeddingModel(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.models?.some((m: { name: string }) => m.name.includes("embed")) || false;
  } catch {
    return false;
  }
}