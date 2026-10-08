// 智谱 AI 服务封装（GLM 系列，OpenAI 兼容接口）
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
const DEFAULT_MODEL = process.env.ZHIPU_MODEL || "glm-4.5-flash";

// 平台可用的对话模型列表
export const AVAILABLE_MODELS = [
  "glm-4.5-flash",
  "glm-4-flash",
  "glm-4.5-air",
  "glm-4.5",
  "glm-4.6",
  "glm-4-plus",
];

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

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZHIPU_API_KEY}`,
  };
}

// 流式调用智谱 AI
export async function streamChat(options: StreamOptions): Promise<void> {
  const { model = DEFAULT_MODEL, messages, onToken, onComplete, onError } = options;

  try {
    if (!ZHIPU_API_KEY) {
      throw new Error("未配置智谱 API Key（ZHIPU_API_KEY）");
    }

    const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`智谱 API 请求失败: ${response.status} ${errText}`.trim());
    }

    //数据流读取器->接口文档：https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStreamDefaultReader
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    //翻译器->接口文档：https://developer.mozilla.org/zh-CN/docs/Web/API/TextDecoder
    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE 事件按行分割，最后一段可能是不完整行，留到下一轮
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const data = JSON.parse(payload);
          const token = data.choices?.[0]?.delta?.content || "";
          if (token) {
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
  if (!ZHIPU_API_KEY) {
    throw new Error("未配置智谱 API Key（ZHIPU_API_KEY）");
  }

  const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`智谱 API 请求失败: ${response.status} ${errText}`.trim());
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// 检查智谱 AI 服务状态（云端服务，检查 API Key 是否已配置）
export function checkZhipuStatus(): { running: boolean; models: string[] } {
  return {
    running: Boolean(ZHIPU_API_KEY),
    models: ZHIPU_API_KEY ? AVAILABLE_MODELS : [],
  };
}
