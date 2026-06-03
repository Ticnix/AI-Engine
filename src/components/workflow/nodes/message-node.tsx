// 消息发送节点 UI
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const MessageNode = memo(({ data }: NodeProps) => {
  const config = data.config as Record<string, unknown>;
  return (
    <div className="workflow-node workflow-node-http">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "消息发送"}</div>
      {(config.channel as string) && (
        <div className="workflow-node-meta">{config.channel as string}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

MessageNode.displayName = "MessageNode";
