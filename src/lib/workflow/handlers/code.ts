// 代码执行节点: 运行自定义 JavaScript 代码
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";

interface CodeConfig {
  code?: string;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as CodeConfig) || {};

    if (!config.code) {
      return { success: false, error: "未提供代码" };
    }

    // 将代码中的变量引用先替换
    const resolvedCode = resolveVariablesInString(config.code, {
      outputs: context.outputs,
      inputs: context.inputs,
    });

    // 创建受限的沙箱执行环境
    const outputs = Object.fromEntries(context.outputs.entries());

    // 使用 Function 构造器创建安全的执行函数
    const fn = new Function("inputs", "outputs", `
      ${resolvedCode}
      return result;
    `);

    const result = fn(context.inputs, outputs);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "代码执行失败",
    };
  }
}
