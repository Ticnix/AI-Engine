// 变量赋值节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const VarsetNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-http">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "变量赋值"}</div>
      {(config.variableName as string) && (
        <div className="workflow-node-meta">{config.variableName as string}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

VarsetNode.displayName = "VarsetNode";
