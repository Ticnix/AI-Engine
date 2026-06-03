import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const RetrievalNode = memo(({ data }: NodeProps) => {
  return (
    <div className="workflow-node workflow-node-retrieval">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon">📚</div>
      <div className="workflow-node-label">{data.label || "知识检索"}</div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
});

RetrievalNode.displayName = "RetrievalNode";
