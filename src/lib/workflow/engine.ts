// 工作流执行引擎主入口
import type { WorkflowNode, WorkflowEdge, ExecutionContext, NodeOutput } from "./types";
import { topologicalSort, type TopologyResult } from "./topology";
import * as handlers from "./handlers";
import { prisma } from "../prisma";

// 节点超时时间 (毫秒)
const DEFAULT_NODE_TIMEOUT = 60000;

// 执行事件回调
export interface ExecutionEvent {
  type: "node_start" | "node_complete" | "node_skip" | "workflow_complete" | "workflow_error";
  nodeId?: string;
  nodeType?: string;
  data?: unknown;
  error?: string;
}

export type OnEvent = (event: ExecutionEvent) => void | Promise<void>;

export interface WorkflowOverride {
  nodes: unknown[];
  edges: unknown[];
}

/**
 * 执行工作流
 */
export async function executeWorkflow(
  workflowId: string,
  input: Record<string, unknown>,
  userId?: string,
  onEvent?: OnEvent,
  override?: WorkflowOverride
): Promise<{
  success: boolean;
  output?: unknown;
  error?: string;
  executionId: string;
}> {
  // 1. 加载工作流
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return { success: false, error: "工作流不存在", executionId: "" };
  }

  // 优先使用请求中传递的节点/边(未保存的画布状态)
  const nodes: WorkflowNode[] = override?.nodes
    ? (override.nodes as unknown as WorkflowNode[])
    : (workflow.nodes as unknown as WorkflowNode[]);
  const edges: WorkflowEdge[] = override?.edges
    ? (override.edges as unknown as WorkflowEdge[])
    : (workflow.edges as unknown as WorkflowEdge[]);

  // 2. 创建执行记录
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status: "running",
      input: input as any,
    },
  });

  // 3. 拓扑排序
  const topo: TopologyResult = topologicalSort(nodes, edges);

  if (topo.hasCycle) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "failed", error: "工作流存在循环依赖", completedAt: new Date() },
    });
    return {
      success: false,
      error: "工作流存在循环依赖, 无法执行",
      executionId: execution.id,
    };
  }

  // 4. 构建执行上下文
  const context: ExecutionContext = {
    inputs: input,
    outputs: new Map<string, unknown>(),
    workflowId,
    executionId: execution.id,
    userId,
  };

  // 5. 分层执行 (同层并行)
  let finalOutput: unknown = undefined;
  let workflowError: string | undefined = undefined;
  let shouldCancel = false;

  for (const layer of topo.layers) {
    if (shouldCancel) break;

    // 并行执行同层节点
    const results = await Promise.allSettled(
      layer.map(async (nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return { nodeId, success: false, error: "节点不存在" };

        // 检查是否需要跳过 (条件分支)
        const shouldSkip = checkSkipCondition(node, edges, context);
        if (shouldSkip) {
          await onEvent?.({
            type: "node_skip",
            nodeId,
            nodeType: node.type,
          });
          await createNodeExecution(execution.id, node, "skipped", undefined, undefined, null);
          return { nodeId, success: true, skipped: true };
        }

        // 执行节点
        return executeNode(node, context, execution.id, onEvent);
      })
    );

    // 处理结果
    for (const result of results) {
      if (result.status === "rejected") {
        workflowError = result.reason instanceof Error ? result.reason.message : "节点执行异常";
        shouldCancel = true;
        break;
      }

      const nodeResult = result.value as { nodeId: string; success: boolean; data?: unknown; error?: string; skipped?: boolean };
      if (!nodeResult.success && !nodeResult.skipped) {
        workflowError = nodeResult.error || "节点执行失败";
        shouldCancel = true;
        break;
      }

      // 收集 output 节点的输出作为工作流最终输出
      const node = nodes.find((n) => n.id === nodeResult.nodeId);
      if (node?.type === "output" && nodeResult.data) {
        finalOutput = nodeResult.data;
      }
    }
  }

  // 6. 更新执行记录
  if (shouldCancel) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: workflowError,
        completedAt: new Date(),
      },
    });
    await onEvent?.({ type: "workflow_error", error: workflowError });
    return { success: false, error: workflowError, executionId: execution.id };
  }

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: "completed",
      output: finalOutput as any,
      completedAt: new Date(),
    },
  });

  await onEvent?.({ type: "workflow_complete", data: finalOutput });
  return { success: true, output: finalOutput, executionId: execution.id };
}

/**
 * 检查节点是否需要跳过 (基于条件分支)
 */
function checkSkipCondition(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  context: ExecutionContext
): boolean {
  // 如果节点有多个上游, 检查是否有条件分支
  const incomingEdges = edges.filter((e) => e.target === node.id);
  if (incomingEdges.length <= 1) return false;

  // 检查上游条件节点的分支决定
  for (const edge of incomingEdges) {
    const sourceNode = context.outputs.get(edge.source);
    // 如果上游是 condition 节点且结果不匹配当前 handle, 则跳过
    if (sourceNode && typeof sourceNode === "object" && "branch" in (sourceNode as any)) {
      const branch = (sourceNode as any).branch;
      const handle = edge.sourceHandle || "true";
      if (branch !== handle) return true;
    }
  }

  return false;
}

/**
 * 执行单个节点
 */
async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  executionId: string,
  onEvent?: OnEvent
): Promise<{ nodeId: string; success: boolean; data?: unknown; error?: string }> {
  const handler = (handlers as any)[node.type];
  if (!handler?.execute) {
    await createNodeExecution(executionId, node, "failed", null, null, `不支持的节点类型: ${node.type}`);
    return { nodeId: node.id, success: false, error: `不支持的节点类型: ${node.type}` };
  }

  // 通知开始
  await onEvent?.({ type: "node_start", nodeId: node.id, nodeType: node.type });

  // 创建运行中的记录
  const nodeExec = await prisma.nodeExecution.create({
    data: {
      executionId,
      nodeId: node.id,
      nodeType: node.type,
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    // 设置超时
    const timeout = DEFAULT_NODE_TIMEOUT;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("节点执行超时")), timeout);
    });

    const result = await Promise.race([
      handler.execute(node, context),
      timeoutPromise,
    ]) as NodeOutput;

    // 保存节点输出到上下文
    context.outputs.set(node.id, result.data);

    // 更新节点执行记录
    await prisma.nodeExecution.update({
      where: { id: nodeExec.id },
      data: {
        status: result.success ? "completed" : "failed",
        input: undefined,
        output: result.data as any,
        error: result.error || null,
        completedAt: new Date(),
      },
    });

    // 通知完成
    await onEvent?.({
      type: "node_complete",
      nodeId: node.id,
      nodeType: node.type,
      data: result.data,
      error: result.error,
    });

    return {
      nodeId: node.id,
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "节点执行异常";

    await prisma.nodeExecution.update({
      where: { id: nodeExec.id },
      data: {
        status: "failed",
        error: errorMsg,
        completedAt: new Date(),
      },
    });

    await onEvent?.({
      type: "node_complete",
      nodeId: node.id,
      nodeType: node.type,
      error: errorMsg,
    });

    return { nodeId: node.id, success: false, error: errorMsg };
  }
}

/**
 * 创建节点执行记录 (用于跳过的节点)
 */
async function createNodeExecution(
  executionId: string,
  node: WorkflowNode,
  status: string,
  input: unknown | undefined,
  output: unknown | undefined,
  error: string | null
) {
  await prisma.nodeExecution.create({
    data: {
      executionId,
      nodeId: node.id,
      nodeType: node.type,
      status,
      input: input as any,
      output: output as any,
      error,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}
