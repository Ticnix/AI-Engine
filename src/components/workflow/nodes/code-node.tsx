// 代码执行节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const CodeNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-http">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "代码执行"}</div>
      {(config.code as string) && (
        <div className="workflow-node-meta">{(config.code as string).slice(0, 30)}...</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

CodeNode.displayName = "CodeNode";
