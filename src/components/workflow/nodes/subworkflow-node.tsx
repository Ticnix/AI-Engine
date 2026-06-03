// 子工作流节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const SubworkflowNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-llm">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "子工作流"}</div>
      {(config.workflowId as string) && (
        <div className="workflow-node-meta">子流程: {(config.workflowId as string).slice(0, 8)}...</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

SubworkflowNode.displayName = "SubworkflowNode";
