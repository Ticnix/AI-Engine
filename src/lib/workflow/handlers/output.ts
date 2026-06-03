// Output 节点: 收集并格式化最终输出
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";

interface OutputConfig {
  template?: string;
  format?: "text" | "markdown" | "json";
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as OutputConfig) || {};

    // 解析模板中的变量, 默认为空
    const rendered = config.template
      ? resolveVariablesInString(config.template, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    // 根据格式处理输出
    let data: unknown;
    if (config.format === "json") {
      try {
        data = JSON.parse(rendered);
      } catch {
        data = rendered;
      }
    } else {
      data = rendered;
    }

    return {
      success: true,
      data: {
        content: rendered,
        format: config.format || "text",
        parsed: data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "输出渲染失败",
    };
  }
}
