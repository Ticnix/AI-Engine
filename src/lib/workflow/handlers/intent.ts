// 意图识别节点: 使用 LLM 对用户输入进行分类
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { chat } from "@/lib/zhipu";
import { resolveVariablesInString } from "../variable";

interface IntentConfig {
  model?: string;
  userPrompt?: string;
  categories?: string;
  temperature?: number;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as IntentConfig) || {};

    // 解析用户提示词中的变量, 默认为空
    const userPrompt = config.userPrompt
      ? resolveVariablesInString(config.userPrompt, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    const categories = config.categories
      ? (JSON.parse(config.categories) as string[])
      : ["通用"];
    const model = config.model || process.env.ZHIPU_MODEL || "glm-4.5-flash";

    // 构建意图识别的 prompt
    const systemPrompt = `你是一个意图识别助手。请分析用户输入，从以下类别中选择最匹配的一个：${categories.join("、")}。只返回类别名称，不要返回其他内容。`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const result = await chat(messages, model);

    const intent = result.trim();

    return {
      success: true,
      data: { intent, categories },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "意图识别失败",
    };
  }
}
