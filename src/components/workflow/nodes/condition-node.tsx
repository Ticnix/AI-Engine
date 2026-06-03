import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export const ConditionNode = memo(({ data }: NodeProps) => {
  return (
    <div className="workflow-node workflow-node-condition">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="workflow-node-icon"></div>
      <div className="workflow-node-label">{data.label || "条件判断"}</div>
      <div className="workflow-node-ports">
        <div className="workflow-node-port-left">
          <Handle type="source" position={Position.Left} id="true" className="!left-0 !top-1/2" />
          <span className="text-xs text-green-400">True</span>
        </div>
        <div className="workflow-node-port-right">
          <Handle type="source" position={Position.Right} id="false" className="!right-0 !top-1/2" />
          <span className="text-xs text-red-400">False</span>
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
