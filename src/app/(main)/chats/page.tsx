"use client";

import { Card, Table, Tag, Button, Space, Modal, message } from "antd";
import { DeleteOutlined, PlusOutlined, MessageOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/request";

interface Chat {
  id: string;
  title: string;
  tokens: number;
  appId: string;
  appName: string;
  messageCount: number;
  createdAt: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: string;
    title: string;
  }>({
    visible: false,
    id: "",
    title: "",
  });

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const data = await api.get<Chat[]>("/api/chats");
      setChats(data);
    } catch {
      message.error("获取对话列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/chats/${deleteModal.id}`);
      message.success("删除成功");
      setDeleteModal({ visible: false, id: "", title: "" });
      fetchChats();
    } catch {
      message.error("删除失败");
    }
  };

  const columns: ColumnsType<Chat> = [
    {
      title: "对话标题",
      dataIndex: "title",
      key: "title",
      width: 200,
      ellipsis: true,
      render: (title: string) => title || "无标题",
    },
    {
      title: "所属智能体",
      dataIndex: "appName",
      key: "appName",
      width: 120,
      ellipsis: true,
      render: (appName: string) => <Tag color="blue">{appName}</Tag>,
    },
    {
      title: "消息数",
      dataIndex: "messageCount",
      key: "messageCount",
      width: 80,
      render: (count: number) => count || 0,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return d.toLocaleDateString("zh-CN");
      },
    },
    {
      title: "Tokens",
      dataIndex: "tokens",
      key: "tokens",
      width: 80,
      render: (tokens: number) => tokens,
    },
    {
      title: "操作",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space>
          <Link href={`/chats/new?chatId=${record.id}`}>
            <Button type="link" icon={<MessageOutlined />} size="small">
              继续
            </Button>
          </Link>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() =>
              setDeleteModal({
                visible: true,
                id: record.id,
                title: record.title,
              })
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
        <h1>对话历史</h1>
        <Link href="/chats/new">
          <Button type="primary" icon={<PlusOutlined />}>
            新建对话
          </Button>
        </Link>
      </div>

      <Card className="page-card">
        <Table
          columns={columns}
          dataSource={chats}
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
        onCancel={() => setDeleteModal({ visible: false, id: "", title: "" })}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除对话 <strong>{deleteModal.title || "无标题"}</strong> 吗？
        </p>
        <p className="text-gray-500">此操作不可恢复，对话中的所有消息都将被删除。</p>
      </Modal>
    </div>
  );
}