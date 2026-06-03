// LLM 节点: 调用 AI 模型生成回答
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";
import { chat, type ChatMessage } from "../../ollama";

interface LLMConfig {
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as LLMConfig) || {};

    // 如果没有配置提示词, 使用默认
    const userPrompt = config.userPrompt
      ? resolveVariablesInString(config.userPrompt, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "你好";

    const systemPrompt = config.systemPrompt
      ? resolveVariablesInString(config.systemPrompt, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : undefined;

    // 构建消息
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    // 调用 Ollama
    const model = config.model || process.env.OLLAMA_MODEL || "qwen2.5:7b";
    const response = await chat(messages, model);

    return {
      success: true,
      data: {
        content: response,
        model,
        tokenEstimate: Math.ceil(response.length / 4),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LLM 调用失败",
    };
  }
}
