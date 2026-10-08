// 文档解析工具（PDF / Markdown，基于内存 Buffer，适配 Serverless 环境）
export async function parsePdfBuffer(dataBuffer: Buffer): Promise<string> {
  // 动态导入 pdf-parse，处理 ESM 兼容性
  const pdfParseModule = await import("pdf-parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * 根据文档类型从 base64 编码的原始文件内容解析出文本
 * @param type 文档类型 ("pdf" | "md")
 * @param fileDataBase64 base64 编码的文件内容
 */
export async function parseDocumentData(
  type: string,
  fileDataBase64: string
): Promise<string> {
  const buffer = Buffer.from(fileDataBase64, "base64");
  if (type === "pdf") {
    return parsePdfBuffer(buffer);
  }
  return buffer.toString("utf-8");
}
