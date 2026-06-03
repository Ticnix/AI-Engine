// 文本模板节点: 使用模板引擎渲染文本
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";

interface TextTemplateConfig {
  template?: string;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as TextTemplateConfig) || {};

    if (!config.template) {
      return { success: false, error: "未提供模板内容" };
    }

    const result = resolveVariablesInString(config.template, {
      outputs: context.outputs,
      inputs: context.inputs,
    });

    return {
      success: true,
      data: { text: result },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "模板渲染失败",
    };
  }
}
