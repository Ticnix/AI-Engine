// 循环节点: 遍历数组并执行子节点
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";

interface LoopConfig {
  iterator?: string;
}

// 在循环节点内并行执行子节点
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as LoopConfig) || {};

    if (!config.iterator) {
      return { success: false, error: "未配置迭代器" };
    }

    // 解析迭代器
    const iteratorValue = resolveLoopIterator(config.iterator, {
      outputs: context.outputs,
      inputs: context.inputs,
    });

    if (!Array.isArray(iteratorValue)) {
      return {
        success: false,
        error: "循环节点的迭代器必须返回数组",
      };
    }

    // 并行执行每个元素
    const results = await Promise.allSettled(
      iteratorValue.map(async (item, index) => {
        try {
          return { index, result: item };
        } catch (e) {
          return { index, error: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && !r.value.error
    ) as PromiseFulfilledResult<{ index: number; result: unknown }>[];
    const failed = results.filter(
      (r) => r.status === "rejected" || (r as any).value?.error
    );

    return {
      success: failed.length === 0,
      data: {
        total: iteratorValue.length,
        results: successful.map((r) => r.value.result),
        errors: failed.map((r) => ({
          index: r.status === "fulfilled" ? r.value.index : -1,
          error: r.status === "rejected" ? r.reason?.message : (r as any).value?.error,
        })),
      },
      error: failed.length > 0 ? `${failed.length} 次循环执行失败` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "循环执行失败",
    };
  }
}

function resolveLoopIterator(
  expr: string,
  ctx: { outputs: Map<string, unknown>; inputs: Record<string, unknown> }
): unknown {
  const match = expr.match(/^\{\{(.+)\}\}$/);
  if (!match) return expr;

  const path = match[1].trim();
  const parts = path.split(".");

  if (parts[0] === "input") {
    let value: unknown = ctx.inputs;
    for (let i = 1; i < parts.length; i++) {
      value = (value as any)?.[parts[i]];
      if (value === undefined) break;
    }
    return value;
  }

  const nodeId = parts[0];
  const output = ctx.outputs.get(nodeId);
  if (!output) return undefined;

  let value: unknown = output;
  for (let i = 1; i < parts.length; i++) {
    value = (value as any)?.[parts[i]];
    if (value === undefined) break;
  }
  return value;
}
