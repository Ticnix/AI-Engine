// Condition 节点: 条件判断, 决定分支走向
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { evaluateCondition } from "../variable";

interface ConditionConfig {
  expression: string;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = node.data.config as unknown as ConditionConfig;
    const expression = config.expression;

    // 如果没有配置表达式, 默认走 true 分支
    if (!expression || expression.trim() === "") {
      return {
        success: true,
        data: {
          result: true,
          expression: "",
          branch: "true",
        },
      };
    }

    // 计算条件表达式
    const result = evaluateCondition(expression, {
      outputs: context.outputs,
      inputs: context.inputs,
    });

    return {
      success: true,
      data: {
        result,
        expression,
        branch: result ? "true" : "false",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "条件判断失败",
    };
  }
}
