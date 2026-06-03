import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const TriggerNode = memo(({ data }: NodeProps) => {
  return (
    <div className="workflow-node workflow-node-trigger">
      <div className="workflow-node-icon">⚡</div>
      <div className="workflow-node-label">{data.label || "触发"}</div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
