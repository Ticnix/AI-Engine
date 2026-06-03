// 工作流核心类型定义

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodeExecutionRecord {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: string;
  input: unknown | null;
  output: unknown | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type NodeType = "trigger" | "llm" | "retrieval" | "condition" | "output" | "http" | "code" | "loop" | "delay" | "variable";

export interface NodeHandler {
  type: NodeType;
  execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeOutput>;
}

export interface NodeOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ExecutionContext {
  inputs: Record<string, unknown>;
  outputs: Map<string, unknown>;
  workflowId: string;
  executionId: string;
  userId?: string;
  abortSignal?: AbortSignal;
}
