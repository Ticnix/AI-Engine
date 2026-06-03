"use client";

import { Card, Table, Tag, Button, Space, Modal, message, Input } from "antd";
import { EditOutlined, DeleteOutlined, CopyOutlined, PlusOutlined, ReloadOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/request";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  draft: { color: "orange", text: "草稿" },
  published: { color: "green", text: "已发布" },
  archived: { color: "default", text: "已归档" },
};

export default function MyFlowPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const data = await api.get<Workflow[]>("/api/workflows");
      setWorkflows(data);
    } catch {
      message.error("获取工作流列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      message.error("请输入工作流名称");
      return;
    }
    try {
      const wf = await api.post<Workflow>("/api/workflows", {
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      message.success("创建成功");
      setCreateModal(false);
      setNewName("");
      setNewDesc("");
      fetchWorkflows();
      router.push(`/flow?id=${wf.id}`);
    } catch {
      message.error("创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/workflows/${id}`);
      message.success("删除成功");
      fetchWorkflows();
    } catch {
      message.error("删除失败");
    }
  };

  const columns: ColumnsType<Workflow> = [
    {
      title: "工作流名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <span className="font-medium">{name}</span>
          {record.description && (
            <div className="text-gray-400 text-xs truncate max-w-xs">
              {record.description}
            </div>
          )}
        </div>
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
      dataIndex: "nodeCount",
      key: "nodeCount",
      width: 80,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => router.push(`/flow?id=${record.id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => router.push(`/flow/history?id=${record.id}`)}
          >
            历史
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              Modal.confirm({
                title: "确认删除",
                content: `确定要删除工作流「${record.name}」吗？`,
                onOk: () => handleDelete(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的工作流</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchWorkflows} loading={loading}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModal(true)}
          >
            新建工作流
          </Button>
        </Space>
      </div>

      <Card className="page-card">
        <Table
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新建工作流"
        open={createModal}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModal(false);
          setNewName("");
          setNewDesc("");
        }}
        okText="创建"
        cancelText="取消"
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">工作流名称</label>
            <Input
              placeholder="请输入工作流名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述 (可选)</label>
            <Input.TextArea
              placeholder="简单描述这个工作流的用途"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
