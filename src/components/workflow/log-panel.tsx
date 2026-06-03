"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Tag } from "antd";
import { DownOutlined, UpOutlined, ClearOutlined } from "@ant-design/icons";

interface LogEntry {
  time: string;
  type: string;
  nodeId?: string;
  nodeType?: string;
  message: string;
  data?: unknown;
}

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogPanel({ logs, onClear }: LogPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [height, setHeight] = useState(300);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // 有日志时自动展开
  useEffect(() => {
    if (logs.length > 0 && collapsed) {
      setCollapsed(false);
    }
  }, [logs.length]);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getTagColor = (type: string) => {
    switch (type) {
      case "node_start": return "blue";
      case "node_complete": return "green";
      case "node_skip": return "default";
      case "workflow_complete": return "green";
      case "workflow_error": return "red";
      default: return "default";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "node_start": return "节点开始";
      case "node_complete": return "节点完成";
      case "node_skip": return "节点跳过";
      case "workflow_complete": return "工作流完成";
      case "workflow_error": return "工作流错误";
      default: return type;
    }
  };

  const highlightJson = (obj: unknown): string => {
    const str = JSON.stringify(obj, null, 2);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = "color:#f8f8f2";
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? "color:#8be9fd" : "color:#f1fa8c";
          } else if (/true|false/.test(match)) {
            cls = "color:#50fa7b";
          } else if (/null/.test(match)) {
            cls = "color:#ff79c6";
          } else {
            cls = "color:#bd93f9";
          }
          return `<span style="${cls}">${match}</span>`;
        }
      );
  };

  // 拖拽调整高度
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [height]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return;
    const diff = startY.current - e.clientY;
    const newH = Math.max(120, Math.min(800, startH.current + diff));
    setHeight(newH);
  }, []);

  const onMouseUp = useCallback(() => {
    resizing.current = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }, []);

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false);
    } else {
      setCollapsed(true);
      setHeight(300); // 重置高度
    }
  };

  return (
    <div
      className={`log-panel ${collapsed ? "collapsed" : ""}`}
      style={{ height: collapsed ? 40 : height }}
    >
      {/* 拖拽手柄 */}
      {!collapsed && (
        <div
          className="log-panel-resize-handle"
          onMouseDown={onMouseDown}
          style={{ cursor: "row-resize" }}
        />
      )}

      <div className="log-panel-header">
        <div className="log-panel-title">
          <Button
            type="text"
            size="small"
            icon={collapsed ? <DownOutlined /> : <UpOutlined />}
            onClick={toggleCollapse}
          >
            运行日志 ({logs.length})
          </Button>
        </div>
        <div className="log-panel-actions">
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={() => {
              setCollapsed(true);
              setHeight(300);
              onClear();
            }}
          >
            清空
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="log-panel-body" ref={logRef}>
          {logs.length === 0 ? (
            <div className="log-panel-empty">点击"运行"开始执行工作流</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">{log.time}</span>
                <Tag color={getTagColor(log.type)} className="log-tag">
                  {getTypeLabel(log.type)}
                </Tag>
                {log.nodeType && (
                  <span className="log-node-type">{log.nodeType}</span>
                )}
                <span className="log-message">{log.message}</span>
                {log.data != null && (
                  <pre
                    className="log-data"
                    dangerouslySetInnerHTML={{ __html: highlightJson(log.data) }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
