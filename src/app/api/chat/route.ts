import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamChat, ChatMessage, checkOllamaStatus } from "@/lib/ollama";
import { getEmbedding, cosineSimilarity } from "@/lib/embedding";
import { executeWorkflow, type ExecutionEvent } from "@/lib/workflow/engine";
import { getCurrentUserId } from "@/lib/auth";

// RAG 检索结果类型
interface RetrievalResult {
  content: string;
  source: string;
  similarity: number;
  documentId: string;
}

// RAG 检索函数：从智能体关联的文档中检索相关内容
async function retrieveRelevantChunks(
  query: string,
  appId: string,
  topK: number = 5,
  threshold: number = 0.5
): Promise<RetrievalResult[]> {
  try {
    // 获取查询向量
    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }

    // 获取智能体关联文档的所有向量分块
    const chunks = await prisma.documentChunk.findMany({
      where: {
        embedding: { not: null },
        document: {
          apps: {
            some: { appId },
          },
        },
      },
      include: {
        document: {
          select: { id: true, originalName: true },
        },
      },
    });

    if (chunks.length === 0) {
      return [];
    }

    // 计算相似度并排序
    const results = chunks
      .map((chunk) => {
        try {
          const embedding = JSON.parse(chunk.embedding as string);
          const similarity = cosineSimilarity(queryEmbedding.embedding, embedding);
          return {
            content: chunk.content,
            source: chunk.document.originalName,
            similarity,
            documentId: chunk.document.id,
          };
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null && item.similarity >= threshold)
      .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
      .slice(0, topK) as RetrievalResult[];

    return results;
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return [];
  }
}

// 流式发送消息到 AI
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, message, chatId } = body;

    if (!appId || !message) {
      return NextResponse.json(
        { error: "appId 和 message 是必填项" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();

    // 检查智能体是否存在且属于当前用户
    const app = await prisma.app.findUnique({
      where: { id: appId, userId: userId || undefined },
      select: { id: true, name: true, model: true, prompt: true, workflowId: true },
    });

    if (!app) {
      return NextResponse.json({ error: "智能体不存在或无权访问" }, { status: 403 });
    }

    // 检查 Ollama 服务状态
    const ollamaStatus = await checkOllamaStatus();
    if (!ollamaStatus.running) {
      // Ollama 未运行，使用模拟响应
      return handleMockResponse(appId, message, chatId);
    }

    // 获取或创建对话
    let chat;
    let previousMessages: ChatMessage[] = [];

    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (chat) {
        previousMessages = chat.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      }
    }

    if (!chat) {
      const title = message.slice(0, 20) + (message.length > 20 ? "..." : "");
      chat = await prisma.chat.create({
        data: {
          appId,
          title,
          tokens: 0,
        },
      });
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: message,
      },
    });

    // RAG 检索：获取相关文档内容
    const relevantChunks = await retrieveRelevantChunks(message, appId);

    // 如果智能体关联了工作流，执行工作流来生成回复（输出为空时自动降级到常规 LLM）
    if (app.workflowId) {
      return handleWorkflowChat(
        { id: app.id, name: app.name, model: app.model, prompt: app.prompt },
        appId,
        app.workflowId,
        message,
        chatId,
        relevantChunks,
        chat,
        previousMessages
      );
    }

    // 构建上下文文本
    let contextText = "";
    const references: { source: string; similarity: number }[] = [];

    if (relevantChunks.length > 0) {
      contextText = "\n\n【参考文档】以下是与问题相关的文档内容，请基于这些内容回答：\n" +
        relevantChunks.map((chunk, i) =>
          `[${i + 1}] 来源: ${chunk.source}\n${chunk.content}`
        ).join("\n\n");

      references.push(...relevantChunks.map(c => ({
        source: c.source,
        similarity: c.similarity,
      })));
    }

    // 构建消息列表
    const messages: ChatMessage[] = [];

    // 添加系统提示词（增强格式让模型更严格遵循）
    if (app.prompt && app.prompt.trim().length > 10) {
      // 只有超过10个字符的提示词才被视为有效人设
      const enhancedPrompt = `【重要指令】请严格遵循以下角色设定，不要偏离：

${app.prompt}

${contextText ? contextText + "\n\n如果参考文档中没有相关信息，请诚实说明，不要编造内容。" : ""}
在所有回复中，你必须保持这个角色的一致性，不要提及你是 AI 或模型。`;
      messages.push({ role: "system", content: enhancedPrompt });
    } else if (contextText) {
      // 无系统提示词但有文档上下文
      messages.push({
        role: "system",
        content: `请基于以下参考文档回答用户问题。如果文档中没有相关信息，请诚实说明，不要编造内容。${contextText}`,
      });
    }

    // 添加历史消息
    messages.push(...previousMessages);

    // 添加当前用户消息
    messages.push({ role: "user", content: message });

    // 创建流式响应
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          await streamChat({
            model: ollamaStatus.models.includes(app.model || "") ? app.model : "qwen2.5:7b",
            messages,
            onToken: (token) => {
              // 发送 SSE 数据
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`)
              );
            },
            onComplete: async (response) => {
              // 保存 AI 消息到数据库
              await prisma.message.create({
                data: {
                  chatId: chat!.id,
                  role: "assistant",
                  content: response,
                },
              });

              // 更新 token 统计（简单估算）
              const tokens = Math.ceil((message.length + response.length) / 4);
              await prisma.chat.update({
                where: { id: chat!.id },
                data: { tokens: { increment: tokens } },
              });

              // 发送完成信号（包含参考来源）
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", chatId: chat!.id, references })}\n\n`)
              );
              controller.close();
            },
            onError: (error) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`)
              );
              controller.close();
            },
          });
        } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: "流式处理失败" })}\n\n`)
            );
            controller.close();
          }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // 禁用 nginx 缓冲
      },
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

// Ollama 未运行时的模拟响应
async function handleMockResponse(
  appId: string,
  message: string,
  chatId: string | null
) {
  // 获取或创建对话
  let chat;
  if (chatId) {
    chat = await prisma.chat.findUnique({ where: { id: chatId } });
  }

  if (!chat) {
    const title = message.slice(0, 20) + (message.length > 20 ? "..." : "");
    chat = await prisma.chat.create({
      data: { appId, title, tokens: 0 },
    });
  }

  // 保存用户消息
  await prisma.message.create({
    data: { chatId: chat.id, role: "user", content: message },
  });

  // 生成模拟响应
  const aiResponse = generateMockResponse(message);

  // 模拟流式输出
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // 分块发送，模拟打字效果
      const words = aiResponse.split("");
      for (const char of words) {
        await new Promise((r) => setTimeout(r, 20)); // 20ms 延迟
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "token", content: char })}\n\n`)
        );
      }

      // 保存 AI 消息
      await prisma.message.create({
        data: { chatId: chat.id, role: "assistant", content: aiResponse },
      });

      // 更新 token
      const tokens = Math.ceil((message.length + aiResponse.length) / 4);
      await prisma.chat.update({
        where: { id: chat.id },
        data: { tokens: { increment: tokens } },
      });

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done", chatId: chat.id })}\n\n`)
      );
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

function generateMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("你好") || lowerMessage.includes("hello")) {
    return "你好！我是你的 AI 助手。由于 Ollama 服务未启动，当前使用模拟响应。请启动 Ollama 服务以获得真实的 AI 回复。";
  }

  if (lowerMessage.includes("帮助") || lowerMessage.includes("help")) {
    return "我可以帮你回答问题、生成内容等。当前是模拟模式，请启动 Ollama 服务（运行 `ollama serve`）以获得真实的 AI 回复。";
  }

  return `感谢你的提问！这是一个模拟响应。\n\n⚠️ Ollama 服务未启动，请运行以下命令启动：\n1. ollama serve\n2. ollama pull qwen2.5:7b\n\n启动后即可获得真实的 AI 回复。`;
}

// App 类型定义
interface AppInfo {
  id: string;
  name: string;
  model: string | null;
  prompt: string | null;
}

// 常规 LLM + RAG 聊天流程（可被工作流降级时调用）
async function handleRegularChat(
  app: AppInfo,
  message: string,
  chatId: string | null,
  relevantChunks: RetrievalResult[],
  chat: { id: string },
  previousMessages: ChatMessage[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  // 构建上下文文本
  let contextText = "";
  const references: { source: string; similarity: number }[] = [];

  if (relevantChunks.length > 0) {
    contextText = "\n\n【参考文档】以下是与问题相关的文档内容，请基于这些内容回答：\n" +
      relevantChunks.map((chunk, i) =>
        `[${i + 1}] 来源: ${chunk.source}\n${chunk.content}`
      ).join("\n\n");

    references.push(...relevantChunks.map(c => ({
      source: c.source,
      similarity: c.similarity,
    })));
  }

  // 构建消息列表
  const messages: ChatMessage[] = [];

  if (app.prompt && app.prompt.trim().length > 10) {
    const enhancedPrompt = `【重要指令】请严格遵循以下角色设定，不要偏离：

${app.prompt}

${contextText ? contextText + "\n\n如果参考文档中没有相关信息，请诚实说明，不要编造内容。" : ""}
在所有回复中，你必须保持这个角色的一致性，不要提及你是 AI 或模型。`;
    messages.push({ role: "system", content: enhancedPrompt });
  } else if (contextText) {
    messages.push({
      role: "system",
      content: `请基于以下参考文档回答用户问题。如果文档中没有相关信息，请诚实说明，不要编造内容。${contextText}`,
    });
  }

  messages.push(...previousMessages);
  messages.push({ role: "user", content: message });

  await streamChat({
    model: "qwen2.5:7b",
    messages,
    onToken: (token) => {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`)
      );
    },
    onComplete: async (response) => {
      await prisma.message.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          content: response,
        },
      });

      const tokens = Math.ceil((message.length + response.length) / 4);
      await prisma.chat.update({
        where: { id: chat.id },
        data: { tokens: { increment: tokens } },
      });

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done", chatId: chat.id, references })}\n\n`)
      );
      controller.close();
    },
    onError: (error) => {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`)
      );
      controller.close();
    },
  });
}

// 工作流模式：执行工作流来生成回复，输出为空时降级到常规 LLM
async function handleWorkflowChat(
  app: AppInfo,
  appId: string,
  workflowId: string,
  message: string,
  chatId: string | null,
  relevantChunks: RetrievalResult[],
  chat: { id: string },
  previousMessages: ChatMessage[]
) {
  // 保存用户消息
  await prisma.message.create({
    data: { chatId: chat.id, role: "user", content: message },
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const events: ExecutionEvent[] = [];
        let workflowOutput: unknown = null;
        let workflowError: string | null = null;

        const onEvent = async (event: ExecutionEvent) => {
          events.push(event);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "workflow_event", event })}\n\n`)
          );

          if (event.type === "workflow_complete") {
            workflowOutput = event.data;
          }
          if (event.type === "workflow_error") {
            workflowError = event.error || "工作流执行失败";
          }
        };

        const result = await executeWorkflow(
          workflowId,
          { message },
          undefined,
          onEvent
        );

        if (workflowError || !result.success) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: workflowError || result.error })}\n\n`)
          );
          controller.close();
          return;
        }

        // 从 output 节点提取 content 字段
        let responseText = "";
        if (workflowOutput && typeof workflowOutput === "object" && "content" in workflowOutput) {
          responseText = (workflowOutput as any).content || "";
        } else if (typeof workflowOutput === "string") {
          responseText = workflowOutput;
        } else if (workflowOutput) {
          responseText = JSON.stringify(workflowOutput);
        }

        // 工作流输出为空时，降级到常规 LLM 流程
        if (!responseText || responseText.trim().length === 0) {
          console.log("工作流输出为空，降级到常规 LLM 流程");
          await handleRegularChat(app, message, chatId, relevantChunks, chat, previousMessages, encoder, controller);
          return;
        }

        // 流式发送回复内容
        for (const char of responseText) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", content: char })}\n\n`)
          );
        }

        // 保存 AI 消息到数据库
        await prisma.message.create({
          data: {
            chatId: chat.id,
            role: "assistant",
            content: responseText,
          },
        });

        // 更新 token 统计
        const tokens = Math.ceil((message.length + responseText.length) / 4);
        await prisma.chat.update({
          where: { id: chat.id },
          data: { tokens: { increment: tokens } },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", chatId: chat.id })}\n\n`)
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: "工作流执行失败" })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}