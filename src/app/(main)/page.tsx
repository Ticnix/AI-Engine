"use client";

import { Card, Row, Col, List, Tag, Badge, Statistic, Spin, App } from "antd";
import {
  AppstoreOutlined,
  MessageOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  PlusOutlined,
  UploadOutlined,
  CommentOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  RocketOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardData {
  stats: {
    apps: number;
    chats: number;
    docs: number;
    flows: number;
  };
  activities: Array<{
    id: string;
    type: string;
    name: string;
    action: string;
    time: string;
    colorClass: string;
  }>;
}

interface HealthData {
  database: { status: "error" | "ok"; message: string };
  api: { status: "error" | "ok"; message: string };
  ollama: { status: "error" | "ok"; message: string };
}

const statsMeta = [
  { key: "apps", icon: <AppstoreOutlined />, colorClass: "color-blue" },
  { key: "chats", icon: <MessageOutlined />, colorClass: "color-green" },
  { key: "docs", icon: <BookOutlined />, colorClass: "color-purple" },
  { key: "flows", icon: <DeploymentUnitOutlined />, colorClass: "color-orange" },
];

const statsLabels: Record<string, string> = {
  apps: "AI 应用",
  chats: "对话总数",
  docs: "知识文档",
  flows: "工作流",
};

const quickActions = [
  { key: "newApp", label: "新建应用", icon: <PlusOutlined />, href: "/apps/new", colorClass: "color-blue", desc: "快速创建 AI 应用" },
  { key: "uploadDoc", label: "上传文档", icon: <UploadOutlined />, href: "/knowledge", colorClass: "color-green", desc: "添加知识库文档" },
  { key: "newChat", label: "发起对话", icon: <CommentOutlined />, href: "/chats", colorClass: "color-purple", desc: "开始 AI 对话" },
  { key: "editFlow", label: "工作流编辑", icon: <EditOutlined />, href: "/flow", colorClass: "color-orange", desc: "可视化流程编排" },
];

const systemStatusMeta = [
  { key: "database" as const, label: "数据库", icon: <DatabaseOutlined /> },
  { key: "api" as const, label: "API 服务", icon: <ApiOutlined /> },
  { key: "ollama" as const, label: "Ollama", icon: <CloudServerOutlined /> },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString("zh-CN");
}

export default function HomePage() {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([d, h]) => {
        setData(d);
        setHealth(h);

        // 如果有服务异常，弹出提示
        const errors: string[] = [];
        if (h?.database?.status === "error") errors.push("数据库");
        if (h?.api?.status === "error") errors.push("API 服务");
        if (h?.ollama?.status === "error") errors.push("Ollama");

        if (errors.length > 0) {
          message.warning({
            content: `系统检测到以下服务异常：${errors.join("、")}，部分功能可能无法正常使用`,
            duration: 5,
          });
        }
      })
      .catch(() => {
        /* 忽略 */
      })
      .finally(() => setLoading(false));
  }, [message]);

  if (loading) {
    return (
      <div className="dashboard-container flex justify-center items-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 顶部：标题 + 欢迎语 */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <RocketOutlined className="dashboard-icon" />
          <h1>AI 应用引擎</h1>
        </div>
        <p className="dashboard-welcome">欢迎回来，开始构建您的智能应用</p>
      </div>

      {/* 上半区：4 个统计卡片 */}
      <Row gutter={[16, 16]} className="stats-row">
        {statsMeta.map((meta) => (
          <Col xs={12} sm={6} key={meta.key}>
            <Card className={`stats-card stats-${meta.key}`}>
              <div className="stats-content">
                <div className={`stats-icon stats-icon-${meta.colorClass}`}>
                  {meta.icon}
                </div>
                <Statistic
                  value={data?.stats?.[meta.key as keyof DashboardData["stats"]] ?? 0}
                  suffix={<span className="stats-label">{statsLabels[meta.key]}</span>}
                  className={`stats-value-${meta.colorClass}`}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 中间区：快捷操作按钮 */}
      <div className="quick-actions-section">
        <h2 className="section-title">快捷入口</h2>
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={6} key={action.key}>
              <Link href={action.href}>
                <Card className={`action-card action-${action.colorClass}`} hoverable>
                  <div className="action-content">
                    <div className={`action-icon action-icon-${action.colorClass}`}>
                      {action.icon}
                    </div>
                    <div className="action-info">
                      <span className={`action-label action-label-${action.colorClass}`}>{action.label}</span>
                      <span className="action-desc">{action.desc}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      {/* 下半区：最近操作 + 系统状态 */}
      <Row gutter={[16, 16]} className="bottom-section">
        {/* 最近操作 */}
        <Col xs={24} lg={16}>
          <Card className="activity-card" title={
            <div className="card-title">
              <ClockCircleOutlined />
              <span>最近操作</span>
            </div>
          }>
            <List
              dataSource={data?.activities || []}
              locale={{ emptyText: "暂无操作记录" }}
              renderItem={(item) => (
                <List.Item className="activity-item">
                  <div className="activity-content">
                    <Tag className={`activity-tag activity-tag-${item.colorClass}`}>{item.action}</Tag>
                    <span className="activity-name">{item.name}</span>
                    <span className="activity-time">{formatTime(item.time)}</span>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 系统状态 */}
        <Col xs={24} lg={8}>
          <Card className="status-card" title={
            <div className="card-title">
              <CloudServerOutlined />
              <span>系统状态</span>
            </div>
          }>
            <div className="status-list">
              {systemStatusMeta.map((sys) => {
                const h = health?.[sys.key];
                const isOk = h?.status === "ok";
                return (
                  <div key={sys.key} className="status-item">
                    <div className="status-icon-wrapper">
                      <Badge status={isOk ? "success" : "error"} />
                      <span className="status-icon">{sys.icon}</span>
                    </div>
                    <span className="status-label">{sys.label}</span>
                    <Tag color={isOk ? "green" : "red"} className="status-tag">
                      {isOk ? h?.message : h?.message || "异常"}
                    </Tag>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
