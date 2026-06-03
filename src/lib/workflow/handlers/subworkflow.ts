// 子工作流节点: 调用另一个工作流
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { executeWorkflow, OnEvent } from "../engine";
import { resolveVariablesInObject } from "../variable";

interface SubworkflowConfig {
  workflowId?: string;
  inputMapping?: Record<string, string>;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as SubworkflowConfig) || {};

    if (!config.workflowId) {
      return { success: false, error: "未指定子工作流" };
    }

    // 解析输入映射
    const resolvedInput = config.inputMapping
      ? resolveVariablesInObject(config.inputMapping, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : {};

    // 传递事件回调以流式输出
    const onEvent: OnEvent = () => {
      // 子工作流的事件也会通过主工作流的 SSE 推送
    };

    const result = await executeWorkflow(
      config.workflowId,
      resolvedInput,
      context.userId,
      onEvent
    );

    return {
      success: result.success,
      data: result.output,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "子工作流调用失败",
    };
  }
}
