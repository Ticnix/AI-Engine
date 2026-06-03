// 变量赋值节点: 定义或修改变量
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString } from "../variable";

interface VarsetConfig {
  variableName?: string;
  expression?: string;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as VarsetConfig) || {};

    if (!config.variableName) {
      return { success: false, error: "未指定变量名" };
    }

    const value = config.expression
      ? resolveVariablesInString(config.expression, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    // 将变量值存储到上下文输出中
    context.outputs.set(node.id, value);

    return {
      success: true,
      data: { [config.variableName]: value },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "变量赋值失败",
    };
  }
}
