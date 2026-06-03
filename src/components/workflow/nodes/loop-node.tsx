// 循环节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const LoopNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-condition">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "循环节点"}</div>
      {(config.iterator as string) && (
        <div className="workflow-node-meta">{config.iterator as string}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

LoopNode.displayName = "LoopNode";
