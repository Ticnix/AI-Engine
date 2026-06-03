// 文本模板节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const TextTemplateNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-output">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "文本模板"}</div>
      {(config.template as string) && (
        <div className="workflow-node-meta">{(config.template as string).slice(0, 30)}...</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

TextTemplateNode.displayName = "TextTemplateNode";
