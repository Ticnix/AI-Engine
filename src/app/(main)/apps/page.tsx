"use client";

import { Card, Table, Button, Space, Tag, Modal, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, MessageOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/request";

interface App {
  id: string;
  name: string;
  description: string | null;
  model: string | null;
  createdAt: string;
  _count?: { chats: number };
}

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; id: string; name: string }>({
    visible: false,
    id: "",
    name: "",
  });

  // 加载智能体列表
  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await api.get<App[]>("/api/apps");
      setApps(data);
    } catch {
      message.error("获取智能体列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除智能体
  const handleDelete = async () => {
    try {
      await api.delete(`/api/apps/${deleteModal.id}`);
      message.success("删除成功");
      setDeleteModal({ visible: false, id: "", name: "" });
      fetchApps();
    } catch {
      message.error("删除失败");
    }
  };

  const columns: ColumnsType<App> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 150,
      ellipsis: true,
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 200,
      ellipsis: true,
      render: (desc: string | null) => desc || "-",
    },
    {
      title: "模型",
      dataIndex: "model",
      key: "model",
      width: 120,
      render: (model: string | null) => (
        <Tag color={model?.includes("gpt-4") ? "purple" : "blue"}>
          {model || "默认"}
        </Tag>
      ),
    },
    {
      title: "对话数",
      key: "chats",
      width: 80,
      render: (_, record) => record._count?.chats || 0,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space>
          <Link href={`/chats/new?appId=${record.id}`}>
            <Button type="link" icon={<MessageOutlined />} size="small">
              对话
            </Button>
          </Link>
          <Link href={`/apps/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} size="small">
              编辑
            </Button>
          </Link>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() =>
              setDeleteModal({ visible: true, id: record.id, name: record.name })
            }
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
        <h1>智能体列表</h1>
        <Link href="/apps/new">
          <Button type="primary" icon={<PlusOutlined />}>
            新建智能体
          </Button>
        </Link>
      </div>

      <Card className="page-card">
        <Table
          columns={columns}
          dataSource={apps}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          tableLayout="fixed"
        />
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, id: "", name: "" })}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除智能体 <strong>{deleteModal.name}</strong> 吗？
        </p>
        <p className="text-gray-500">删除后关联的对话记录也会被删除，此操作不可恢复。</p>
      </Modal>
    </div>
  );
}