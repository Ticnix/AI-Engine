"use client";

import { Card, Table, Tag, Button, Space, Descriptions, Collapse, Empty } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/request";

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  nodeExecutions: NodeExecution[];
}

interface NodeExecution {
  id: string;
  nodeId: string;
  nodeType: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

const statusMap: Record<string, { color: string; text: string }> = {
  running: { color: "blue", text: "执行中" },
  completed: { color: "green", text: "已完成" },
  failed: { color: "red", text: "失败" },
  cancelled: { color: "default", text: "已取消" },
};

const nodeStatusMap: Record<string, { color: string; text: string }> = {
  pending: { color: "default", text: "等待中" },
  running: { color: "blue", text: "执行中" },
  completed: { color: "green", text: "成功" },
  failed: { color: "red", text: "失败" },
  skipped: { color: "default", text: "已跳过" },
};

export default function FlowHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id") || "";
  const execId = searchParams.get("execId") || "";

  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<WorkflowExecution | null>(null);

  useEffect(() => {
    if (workflowId) fetchExecutions();
  }, [workflowId]);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const data = await api.get<WorkflowExecution[]>(
        `/api/workflows/${workflowId}/executions`
      );
      setExecutions(data);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  };

  const execColumns: ColumnsType<WorkflowExecution> = [
    {
      title: "执行ID",
      dataIndex: "id",
      key: "id",
      width: 180,
      render: (id: string) => (
        <Button type="link" size="small" onClick={() => router.push(`/flow/history?id=${workflowId}&execId=${id}`)}>
          {id.slice(0, 8)}...
        </Button>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={statusMap[status]?.color || "default"}>
          {statusMap[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: "节点数",
      key: "nodeCount",
      width: 80,
      render: (_, record) => record.nodeExecutions.length,
    },
    {
      title: "开始时间",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 160,
      render: (date: string) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "耗时",
      key: "duration",
      width: 100,
      render: (_, record) => {
        if (!record.completedAt) return "-";
        const start = new Date(record.startedAt).getTime();
        const end = new Date(record.completedAt).getTime();
        const ms = end - start;
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
      },
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => setSelectedExec(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  // 简易 JSON 语法高亮
  const highlightJson = (obj: unknown): string => {
    const str = JSON.stringify(obj, null, 2);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = "color:#f8f8f2"; // default
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? "color:#8be9fd" : "color:#f1fa8c"; // key or string
          } else if (/true|false/.test(match)) {
            cls = "color:#50fa7b"; // boolean
          } else if (/null/.test(match)) {
            cls = "color:#ff79c6"; // null
          } else {
            cls = "color:#bd93f9"; // number
          }
          return `<span style="${cls}">${match}</span>`;
        }
      );
  };

  const nodeColumns: ColumnsType<NodeExecution> = [
    {
      title: "节点ID",
      dataIndex: "nodeId",
      key: "nodeId",
      width: 180,
      ellipsis: true,
    },
    {
      title: "类型",
      dataIndex: "nodeType",
      key: "nodeType",
      width: 100,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={nodeStatusMap[status]?.color || "default"}>
          {nodeStatusMap[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: "耗时",
      key: "duration",
      width: 100,
      render: (_, record) => {
        if (!record.startedAt || !record.completedAt) return "-";
        const ms = new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime();
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
      },
    },
    {
      title: "输出",
      key: "output",
      render: (_, record) =>
        record.output ? (
          <pre
            className="text-xs p-2 rounded max-h-32 overflow-auto"
            style={{ background: "#282a36", color: "#f8f8f2" }}
            dangerouslySetInnerHTML={{ __html: highlightJson(record.output) }}
          />
        ) : (
          <span className="text-xs text-white/40">-</span>
        ),
    },
  ];

  if (!workflowId) {
    return (
      <div className="page-container">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/flow/my")}>
          返回
        </Button>
        <Empty description="请指定工作流ID" className="mt-8" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/flow/my")}>
            返回
          </Button>
          <h1 className="m-0">执行历史</h1>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchExecutions} loading={loading}>
          刷新
        </Button>
      </div>

      <Card className="page-card mb-4">
        <Table
          columns={execColumns}
          dataSource={executions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {selectedExec && (
        <Card className="page-card" title="执行详情">
          <Descriptions column={2} size="small" className="mb-4">
            <Descriptions.Item label="执行ID">{selectedExec.id}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[selectedExec.status]?.color}>
                {statusMap[selectedExec.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {new Date(selectedExec.startedAt).toLocaleString("zh-CN")}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {selectedExec.completedAt
                ? new Date(selectedExec.completedAt).toLocaleString("zh-CN")
                : "-"}
            </Descriptions.Item>
          </Descriptions>

          {selectedExec.error && (
            <div className="bg-red-900/20 border border-red-800 rounded p-3 mb-4">
              <span className="text-red-400 font-medium">错误: </span>
              {selectedExec.error}
            </div>
          )}

          {/* 输入数据 — 有实际内容才展示 */}
          {selectedExec.input && Object.keys(selectedExec.input as any).length > 0 && (
            <Collapse
              items={[
                {
                  key: "input",
                  label: "输入数据",
                  children: (
                    <pre
                      className="text-xs p-3 rounded overflow-auto"
                      style={{ background: "#282a36", color: "#f8f8f2" }}
                      dangerouslySetInnerHTML={{ __html: highlightJson(selectedExec.input) }}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* 输出结果 — 优先展示 output 节点的 content 字段 */}
          {(selectedExec.output as any) && (
            <Collapse
              className="mt-2"
              defaultActiveKey={["output"]}
              items={[
                {
                  key: "output",
                  label: "输出结果",
                  children: (() => {
                    const out = selectedExec.output as any;
                    // 如果是 output 节点的返回格式, 优先展示 content
                    if (out.content) {
                      return (
                        <div>
                          {out.format === "markdown" ? (
                            <div className="prose prose-invert max-w-none">{out.content}</div>
                          ) : (
                            <pre
                              className="text-xs p-3 rounded overflow-auto whitespace-pre-wrap"
                              style={{ background: "#282a36", color: "#f8f8f2" }}
                            >
                              {out.content}
                            </pre>
                          )}
                        </div>
                      );
                    }
                    return (
                      <pre
                        className="text-xs p-3 rounded overflow-auto"
                        style={{ background: "#282a36", color: "#f8f8f2" }}
                        dangerouslySetInnerHTML={{ __html: highlightJson(selectedExec.output) }}
                      />
                    );
                  })(),
                },
              ]}
            />
          )}

          <h3 className="mt-4 mb-2 text-white/80">节点执行情况</h3>
          <Table
            columns={nodeColumns}
            dataSource={selectedExec.nodeExecutions}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}
