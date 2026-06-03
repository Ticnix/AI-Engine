// DAG 拓扑排序 + 执行顺序计算
import type { WorkflowNode, WorkflowEdge } from "./types";

export interface TopologyResult {
  order: string[]; // 节点 ID 的执行顺序 (拓扑排序)
  hasCycle: boolean;
  layers: string[][]; // 分层: 同层节点可以并行执行
  entryNodes: string[]; // 入口节点 (没有上游的节点)
}

/**
 * 从 nodes + edges 构建邻接表
 */
function buildGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): {
  adj: Map<string, string[]>; // node → 下游节点
  inDegree: Map<string, number>; // node → 入度
  reverseAdj: Map<string, string[]>; // node → 上游节点
} {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const reverseAdj = new Map<string, string[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
    reverseAdj.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    reverseAdj.get(edge.target)?.push(edge.source);
  }

  return { adj, inDegree, reverseAdj };
}

/**
 * 拓扑排序 (Kahn 算法)
 * 同时分层以便支持并行执行
 */
export function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): TopologyResult {
  const { adj, inDegree } = buildGraph(nodes, edges);

  // 找到所有入度为 0 的节点 (入口节点)
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order: string[] = [];
  const layers: string[][] = [];

  // BFS 分层
  let currentLayer = [...queue];
  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    order.push(...currentLayer);

    const nextLayer: string[] = [];
    for (const nodeId of currentLayer) {
      for (const neighbor of adj.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          nextLayer.push(neighbor);
        }
      }
    }
    currentLayer = nextLayer;
  }

  // 检查是否有环 (如果有节点没被遍历到, 说明有环)
  const hasCycle = order.length !== nodes.length;

  // 入口节点 = 第一层的节点
  const entryNodes = layers[0] || [];

  return { order, hasCycle, layers, entryNodes };
}

/**
 * 获取节点的所有上游节点 (递归)
 */
export function getUpstreamNodes(
  nodeId: string,
  edges: WorkflowEdge[],
  visited = new Set<string>()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const upstream: string[] = [];
  for (const edge of edges) {
    if (edge.target === nodeId && !visited.has(edge.source)) {
      upstream.push(edge.source);
      upstream.push(...getUpstreamNodes(edge.source, edges, visited));
    }
  }
  return upstream;
}

/**
 * 获取节点的所有下游节点 (递归)
 */
export function getDownstreamNodes(
  nodeId: string,
  edges: WorkflowEdge[],
  visited = new Set<string>()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const downstream: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId && !visited.has(edge.target)) {
      downstream.push(edge.target);
      downstream.push(...getDownstreamNodes(edge.target, edges, visited));
    }
  }
  return downstream;
}
