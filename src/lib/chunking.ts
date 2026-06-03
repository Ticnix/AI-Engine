// 文档分块服务

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
}

/**
 * 文档分块配置
 */
export interface ChunkConfig {
  chunkSize: number;      // 每块最大字符数
  chunkOverlap: number;   // 块之间的重叠字符数
  minChunkSize: number;   // 最小块大小
}

const DEFAULT_CONFIG: ChunkConfig = {
  chunkSize: 1000,        // 约 250-300 tokens
  chunkOverlap: 200,      // 约 50 tokens 重叠
  minChunkSize: 100,
};

/**
 * 智能文档分块
 * 按段落分割，保持语义完整性
 */
export function chunkText(
  text: string,
  config: Partial<ChunkConfig> = {}
): TextChunk[] {
  const { chunkSize, chunkOverlap, minChunkSize } = { ...DEFAULT_CONFIG, ...config };

  const chunks: TextChunk[] = [];

  // 先按段落分割（双换行符）
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    // 如果当前段落本身就超过块大小，需要按句子进一步分割
    if (paragraph.length > chunkSize) {
      // 先保存当前累积的内容
      if (currentChunk.length >= minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: Math.ceil(currentChunk.length / 4),
        });
        // 保留重叠部分
        currentChunk = currentChunk.slice(-chunkOverlap);
      }

      // 按句子分割长段落（中英文句子分隔符）
      const sentences = paragraph.match(/[^。！？.!?]+[。！？.!?]+/g) || [paragraph];

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize) {
          if (currentChunk.length >= minChunkSize) {
            chunks.push({
              content: currentChunk.trim(),
              index: chunkIndex++,
              tokenCount: Math.ceil(currentChunk.length / 4),
            });
            currentChunk = currentChunk.slice(-chunkOverlap);
          }
        }
        currentChunk += sentence;
      }
    } else {
      // 段落大小合适，直接添加
      if (currentChunk.length + paragraph.length + 2 > chunkSize) {
        if (currentChunk.length >= minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
            tokenCount: Math.ceil(currentChunk.length / 4),
          });
          currentChunk = currentChunk.slice(-chunkOverlap);
        }
      }
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  // 保存最后一块
  if (currentChunk.trim().length >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: Math.ceil(currentChunk.length / 4),
    });
  }

  return chunks;
}

/**
 * 为分块添加文档元数据上下文
 */
export function enhanceChunkWithContext(
  chunk: TextChunk,
  metadata: {
    documentName: string;
    documentId: string;
  }
): string {
  return `[来源: ${metadata.documentName}]\n${chunk.content}`;
}