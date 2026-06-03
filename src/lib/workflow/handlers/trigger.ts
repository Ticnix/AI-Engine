// Trigger 节点: 工作流入口, 返回触发输入
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  // Trigger 节点直接返回工作流的输入数据
  return {
    success: true,
    data: context.inputs,
  };
}
