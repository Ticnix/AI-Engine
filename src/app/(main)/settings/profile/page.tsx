"use client";

import { Card, Avatar, Button, Descriptions, Spin, Row, Col, Statistic, Typography, Alert } from "antd";
import { UserOutlined, AppstoreOutlined, MessageOutlined, BookOutlined, DeploymentUnitOutlined, EditOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/request";

const { Title, Text } = Typography;

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface UserStats {
  apps: number;
  chats: number;
  docs: number;
  workflows: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          setAuthError("请先登录后查看个人中心");
          setLoading(false);
          return;
        }
        const u = await res.json();
        setUser(u);

        const data = await api.get<UserStats>("/api/user/stats");
        setStats(data);
      } catch {
        setAuthError("加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>个人中心</h1>
        </div>
        <Card className="page-card max-w-2xl">
          <Alert message={authError} type="warning" showIcon style={{ marginBottom: 16 }} />
          <Button type="primary" onClick={() => router.push("/login")}>
            去登录
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>个人中心</h1>
      </div>

      {/* 用户信息卡片 */}
      <Card className="page-card mb-4">
        <Row gutter={[24, 16]} align="middle">
          <Col>
            <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: "#1890ff" }} />
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>{user?.name || "未设置用户名"}</Title>
            <Text type="secondary">{user?.email}</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => router.push("/settings/account")}
            >
              编辑资料
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 用户统计 */}
      <Card className="page-card mb-4" title="使用统计">
        <Row gutter={[16, 16]}>
          <Col xs={6}>
            <Statistic
              title={<Text type="secondary">智能体</Text>}
              value={stats?.apps || 0}
              prefix={<AppstoreOutlined />}
            />
          </Col>
          <Col xs={6}>
            <Statistic
              title={<Text type="secondary">对话</Text>}
              value={stats?.chats || 0}
              prefix={<MessageOutlined />}
            />
          </Col>
          <Col xs={6}>
            <Statistic
              title={<Text type="secondary">文档</Text>}
              value={stats?.docs || 0}
              prefix={<BookOutlined />}
            />
          </Col>
          <Col xs={6}>
            <Statistic
              title={<Text type="secondary">工作流</Text>}
              value={stats?.workflows || 0}
              prefix={<DeploymentUnitOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 账户信息 */}
      <Card className="page-card" title="账户信息">
        <Descriptions column={1} size="large">
          <Descriptions.Item label="用户 ID">
            <Text code copyable>{user?.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱地址">
            {user?.email}
          </Descriptions.Item>
          <Descriptions.Item label="用户名">
            {user?.name || "未设置"}
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {user?.createdAt ? new Date(user.createdAt).toLocaleString("zh-CN") : "未知"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
