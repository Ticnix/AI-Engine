// Ollama AI 服务封装（本地免费运行）
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model?: string;
  messages: ChatMessage[];
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

// 流式调用 Ollama
export async function streamChat(options: StreamOptions): Promise<void> {
  const { model = DEFAULT_MODEL, messages, onToken, onComplete, onError } = options;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama 请求失败: ${response.status}`);
    }

    //数据流读取器->接口文档：https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStreamDefaultReader
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }
 
    //翻译器->接口文档：https://developer.mozilla.org/zh-CN/docs/Web/API/TextDecoder
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            const token = data.message.content;
            fullResponse += token;
            onToken(token);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    onError(error instanceof Error ? error : new Error("未知错误"));
  }
}

// 非流式调用（用于简单场景）
export async function chat(
  messages: ChatMessage[],
  model = DEFAULT_MODEL
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || "";
}

// 检查 Ollama 服务状态
export async function checkOllamaStatus(): Promise<{ running: boolean; models: string[] }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return { running: false, models: [] };
    }
    const data = await response.json();
    return {
      running: true,
      models: data.models?.map((m: { name: string }) => m.name) || [],
    };
  } catch {
    return { running: false, models: [] };
  }
}