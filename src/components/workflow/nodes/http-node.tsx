import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const HTTPNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-http">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "HTTP 请求"}</div>
      {(config.method as string) && (
        <div className="workflow-node-meta">{(config.method as string).toUpperCase()}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

HTTPNode.displayName = "HTTPNode";
