// 意图识别节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const IntentNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-llm">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon">🎯</div>
      <div className="workflow-node-label">{data.label || "意图识别"}</div>
      {(config.model as string) && (
        <div className="workflow-node-meta">{config.model as string}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

IntentNode.displayName = "IntentNode";
