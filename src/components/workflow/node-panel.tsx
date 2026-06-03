"use client";

import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";

interface NodePanelProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onAddNode: (nodeType: string) => void;
}

interface NodeTemplate {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: "flow" | "ai" | "data";
}

const nodeTemplates: NodeTemplate[] = [
  //  流程控制
  { type: "trigger", label: "开始", icon: "", description: "工作流入口节点", category: "flow" },
  { type: "output", label: "结束", icon: "🏁", description: "返回工作流结果", category: "flow" },
  { type: "condition", label: "条件分支", icon: "", description: "if / else 分支判断", category: "flow" },
  { type: "loop", label: "循环", icon: "", description: "遍历数组逐项执行", category: "flow" },
  { type: "subworkflow", label: "子工作流", icon: "📦", description: "调用其他工作流", category: "flow" },

  // 🤖 AI 能力
  { type: "retrieval", label: "知识库检索", icon: "📚", description: "向量相似度搜索", category: "ai" },
  { type: "llm", label: "LLM 对话", icon: "", description: "调用 AI 大模型", category: "ai" },
  { type: "intent", label: "意图识别", icon: "🎯", description: "基于 LLM 识别用户意图", category: "ai" },

  // ⚙️ 数据处理
  { type: "varset", label: "变量赋值", icon: "", description: "定义或修改变量", category: "data" },
  { type: "message", label: "消息提示", icon: "", description: "发送邮件、Webhook 通知", category: "data" },
  { type: "http", label: "HTTP 请求", icon: "", description: "调用外部 API", category: "data" },
  { type: "code", label: "代码执行", icon: "", description: "运行自定义 JS 代码", category: "data" },
  { type: "texttemplate", label: "文本模板", icon: "📝", description: "模板引擎渲染文本", category: "data" },
];

const CATEGORIES = [
  { key: "flow" as const, label: "流程控制", emoji: "📌" },
  { key: "ai" as const, label: "AI 能力", emoji: "" },
  { key: "data" as const, label: "数据处理", emoji: "️" },
];

export function NodePanel({ onDragStart, onAddNode }: NodePanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["flow", "ai", "data"])
  );

  const grouped = CATEGORIES.reduce<Record<string, NodeTemplate[]>>((acc, cat) => {
    acc[cat.key] = nodeTemplates.filter((n) => n.category === cat.key);
    return acc;
  }, {});

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const renderNodes = (nodes: NodeTemplate[]) => (
    <>
      {nodes.map((node) => (
        <div
          key={node.type}
          className="node-panel-item"
          draggable
          onDragStart={(e) => onDragStart(e, node.type)}
          onDoubleClick={() => onAddNode(node.type)}
        >
          <span className="node-panel-item-icon">{node.icon}</span>
          <div className="node-panel-item-info">
            <div className="node-panel-item-label">{node.label}</div>
            <div className="node-panel-item-desc">{node.description}</div>
          </div>
          <button
            className="node-panel-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddNode(node.type);
            }}
            title="添加到画布"
          >
            <PlusOutlined />
          </button>
        </div>
      ))}
    </>
  );

  return (
    <div className="node-panel">
      <div className="node-panel-header">
        <h3>节点库</h3>
        <div className="node-panel-hint">点击 + 添加，或拖拽到画布</div>
      </div>

      {CATEGORIES.map((cat) => {
        const nodes = grouped[cat.key] || [];
        const isExpanded = expandedCategories.has(cat.key);
        return (
          <div key={cat.key} className="node-panel-section">
            <button
              className="node-panel-section-toggle"
              onClick={() => toggleCategory(cat.key)}
            >
              {cat.emoji} {cat.label} ({nodes.length})
            </button>
            {isExpanded && renderNodes(nodes)}
          </div>
        );
      })}
    </div>
  );
}
