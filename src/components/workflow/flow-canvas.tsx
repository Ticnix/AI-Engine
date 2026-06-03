"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  MarkerType,
  XYPosition,
} from "reactflow";
import "reactflow/dist/style.css";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { DeleteOutlined } from "@ant-design/icons";
import { FlowToolbar } from "./flow-toolbar";
import { NodePanel } from "./node-panel";
import { ConfigPanel } from "./config-panel";
import { LogPanel } from "./log-panel";
import {
  TriggerNode,
  LLMNode,
  RetrievalNode,
  ConditionNode,
  OutputNode,
  HTTPNode,
  IntentNode,
  SubworkflowNode,
  CodeNode,
  MessageNode,
  LoopNode,
  VarsetNode,
  TextTemplateNode,
} from "./nodes";
import { api } from "@/lib/request";
import { message } from "antd";

// 自定义节点类型 — 定义在组件外避免重复创建
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  retrieval: RetrievalNode,
  condition: ConditionNode,
  output: OutputNode,
  http: HTTPNode,
  intent: IntentNode,
  subworkflow: SubworkflowNode,
  code: CodeNode,
  message: MessageNode,
  loop: LoopNode,
  varset: VarsetNode,
  texttemplate: TextTemplateNode,
};

// 默认边样式 — 定义在组件外避免重复创建
const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};

interface LogEntry {
  time: string;
  type: string;
  nodeId?: string;
  nodeType?: string;
  message: string;
  data?: unknown;
}

const DEFAULT_LABELS: Record<string, string> = {
  trigger: "触发",
  llm: "LLM 对话",
  retrieval: "知识检索",
  condition: "条件判断",
  output: "输出",
  http: "HTTP 请求",
  intent: "意图识别",
  subworkflow: "子工作流",
  code: "代码执行",
  message: "消息发送",
  loop: "循环节点",
  varset: "变量赋值",
  texttemplate: "文本模板",
};

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowId, setWorkflowId] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("draft");
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; originalName: string }[]>([]);
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);
  const [menuPosition, setMenuPosition] = useState<XYPosition>({ x: 0, y: 0 });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 加载工作流
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      setWorkflowId(id);
      loadWorkflow(id);
    }
    loadApps();
    loadDocuments();
    loadWorkflows();
  }, []);

  const loadWorkflow = async (id: string) => {
    try {
      const data = await api.get(`/api/workflows/${id}`) as any;
      const loadedNodes = (data.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data || { label: getDefaultLabel(n.type), config: {} },
      }));
      const loadedEdges = (data.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }));
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setWorkflowName(data.name || "");
      setWorkflowStatus(data.status || "draft");
    } catch {
      message.error("加载工作流失败");
    }
  };

  const loadApps = async () => {
    try {
      const data = await api.get<{ id: string; name: string }[]>("/api/apps");
      setApps(data);
    } catch {
      // 忽略
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await api.get<{ id: string; originalName: string }[]>("/api/documents");
      setDocuments(data);
    } catch {
      // 忽略
    }
  };

  const loadWorkflows = async () => {
    try {
      const data = await api.get<{ id: string; name: string }[]>("/api/workflows");
      setWorkflows(data);
    } catch {
      // 忽略
    }
  };

  const getDefaultLabel = (type: string): string => {
    return DEFAULT_LABELS[type] || type;
  };

  // 拖拽开始
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  // 添加节点到指定位置
  const addNodeAtPosition = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: getDefaultLabel(type),
          config: {},
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // 拖拽放置
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      // screenToFlowPosition 直接使用视口坐标
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 节点默认尺寸约 200x100, 让节点中心对准鼠标位置
      addNodeAtPosition(type, {
        x: position.x - 100,
        y: position.y - 50,
      });
    },
    [reactFlowInstance, addNodeAtPosition]
  );

  // 点击添加节点 (添加到画布可视区域中心)
  const handleAddNode = useCallback(
    (type: string) => {
      if (!reactFlowInstance) {
        addNodeAtPosition(type, { x: 200, y: 200 });
        return;
      }

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) {
        addNodeAtPosition(type, { x: 200, y: 200 });
        return;
      }

      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const position = reactFlowInstance.screenToFlowPosition({
        x: centerX,
        y: centerY,
      });
      addNodeAtPosition(type, position);
    },
    [reactFlowInstance, addNodeAtPosition]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 连线
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // 节点左键点击选择
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // 右键菜单 — 使用原生事件监听，比 ReactFlow 的 onNodeContextMenu 更可靠
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const handleContextMenu = (e: MouseEvent) => {
      // 通过边界检测找到右键点击的节点
      const node = nodes.find((n) => {
        // ReactFlow 节点容器有 data-id 属性
        const el = wrapper.querySelector(`[data-id="${n.id}"]`);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
      });
      if (node) {
        e.preventDefault();
        setContextMenuNode(node);
        setMenuPosition({ x: e.clientX, y: e.clientY });
      } else {
        setContextMenuNode(null);
      }
    };

    const handleClick = () => setContextMenuNode(null);

    wrapper.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClick);
    return () => {
      wrapper.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClick);
    };
  }, [nodes]);

  // 面板空白处点击取消选择 + 关闭右键菜单
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenuNode(null);
  }, []);

  // 更新节点配置
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<Node["data"]>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev
      );
    },
    [setNodes]
  );

  // 删除节点
  const deleteNode = useCallback(
    (node: Node) => {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) =>
        eds.filter(
          (edge) => edge.source !== node.id && edge.target !== node.id
        )
      );
      if (selectedNode?.id === node.id) setSelectedNode(null);
      if (contextMenuNode?.id === node.id) setContextMenuNode(null);
    },
    [setNodes, setEdges, selectedNode, contextMenuNode]
  );

  // 键盘删除选中节点
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode && !target.closest("input, textarea")) {
        e.preventDefault();
        deleteNode(selectedNode);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, deleteNode]);

  // 处理节点变化 (移动等)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (selectedNode) {
        const movedNode = changes.find(
          (c) => c.type === "position" && c.id === selectedNode.id
        ) as any;
        if (movedNode?.position) {
          setSelectedNode((prev) =>
            prev?.id === selectedNode.id
              ? { ...prev, position: movedNode.position }
              : prev
          );
        }
      }
    },
    [onNodesChange, selectedNode]
  );

  // 处理 SSE 流
  const handleStreamResponse = async (body: ReadableStream) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), type: "workflow_start", message: "开始执行..." },
    ]);

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.type === "done") continue;

            const entry: LogEntry = {
              time: new Date().toLocaleTimeString(),
              type: data.type,
              nodeId: data.nodeId,
              nodeType: data.nodeType,
              message: getNodeMessage(data),
              data: data.data,
            };
            setLogs((prev) => [...prev, entry]);

            if (data.error) {
              message.error(data.error);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  };

  const getNodeMessage = (data: any): string => {
    switch (data.type) {
      case "node_start":
        return `节点 "${data.nodeType}" 开始执行`;
      case "node_complete":
        return data.error ? `节点 "${data.nodeType}" 执行失败: ${data.error}` : `节点 "${data.nodeType}" 执行完成`;
      case "node_skip":
        return `节点 "${data.nodeType}" 已跳过`;
      case "workflow_complete":
        return "工作流执行完成";
      case "workflow_error":
        return `工作流执行失败: ${data.error}`;
      default:
        return data.type;
    }
  };

  return (
    <div className="flow-editor">
      <FlowToolbar
        workflowId={workflowId}
        nodes={nodes}
        edges={edges}
        workflowName={workflowName}
        status={workflowStatus}
        onWorkflowUpdated={() => {
          if (workflowId) loadWorkflow(workflowId);
          loadWorkflows();
        }}
        onRun={handleStreamResponse}
        onCreateWorkflow={(newId) => {
          setWorkflowId(newId);
          const url = new URL(window.location.href);
          url.searchParams.set("id", newId);
          window.history.replaceState({}, "", url.toString());
          loadWorkflows();
        }}
      />

      <div className="flow-editor-body">
        <NodePanel onDragStart={onDragStart} onAddNode={handleAddNode} />

        <div className="flow-canvas-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={(changes: EdgeChange[]) => onEdgesChange(changes)}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <ConfigPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          apps={apps}
          documents={documents}
          workflows={workflows}
        />
      </div>

      <LogPanel logs={logs} onClear={() => setLogs([])} />

      {/* 右键菜单 — 用 Portal 渲染到 body 避免被父容器裁剪 */}
      {contextMenuNode &&
        createPortal(
          <div
            className="context-menu"
            style={{
              position: "fixed",
              left: menuPosition.x,
              top: menuPosition.y,
              zIndex: 10000,
            }}
          >
            <div className="context-menu-body">
              <div
                className="context-menu-item danger"
                onClick={() => {
                  deleteNode(contextMenuNode);
                }}
              >
                <DeleteOutlined className="context-menu-icon" />
                <span>删除节点</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
