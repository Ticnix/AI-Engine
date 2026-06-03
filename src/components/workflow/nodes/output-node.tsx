import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const OutputNode = memo(({ data }: NodeProps) => {
  return (
    <div className="workflow-node workflow-node-output">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon">📤</div>
      <div className="workflow-node-label">{data.label || "输出"}</div>
    </div>
  );
});

OutputNode.displayName = "OutputNode";
