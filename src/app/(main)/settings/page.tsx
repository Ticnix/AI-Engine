"use client";

import { Card, Form, Switch, Button, Descriptions, Tag, Badge, Spin, Space, Divider, Typography } from "antd";
import { SunOutlined, MoonOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useThemeStore } from "@/stores/theme-store";
import { useEffect, useState } from "react";

const { Text } = Typography;

interface SystemInfo {
  ollama: {
    running: boolean;
    url: string;
    defaultModel: string;
    models: string[];
  };
  stats: {
    apps: number;
    chats: number;
    docs: number;
    workflows: number;
    executions: number;
  };
}

export default function SettingsPage() {
  const { mode, setTheme } = useThemeStore();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInfo = async () => {
    if (refreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/settings/status");
      const data = await res.json();
      setInfo(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const statusTag = (running: boolean) =>
    running ? (
      <Tag color="success" icon={<CheckCircleOutlined />}>运行中</Tag>
    ) : (
      <Tag color="error" icon={<CloseCircleOutlined />}>未运行</Tag>
    );

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>系统设置</h1>
      </div>

      <div className="max-w-3xl">
        {/* 外观设置 */}
        <Card className="page-card mb-4" title="外观设置">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Text strong>主题模式</Text>
              <div style={{ color: "#888", fontSize: 12 }}>切换系统的深色/浅色显示模式</div>
            </div>
            <Space>
              <Button
                type={mode === "dark" ? "primary" : "default"}
                icon={<MoonOutlined />}
                onClick={() => setTheme("dark")}
              >
                深色
              </Button>
              <Button
                type={mode === "light" ? "primary" : "default"}
                icon={<SunOutlined />}
                onClick={() => setTheme("light")}
              >
                浅色
              </Button>
            </Space>
          </div>
        </Card>

        {/* 模型配置 */}
        <Card
          className="page-card mb-4"
          title={
            <Space>
              <span>模型配置</span>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={fetchInfo}
              >
                刷新状态
              </Button>
            </Space>
          }
        >
          <Descriptions column={1} size="middle">
            <Descriptions.Item label="Ollama 服务">
              {info && statusTag(info.ollama.running)}
              {!info && <Text type="secondary">未知</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="服务地址">
              <Text code>{info?.ollama.url || "http://localhost:11434"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="默认模型">
              <Text code>{info?.ollama.defaultModel || "qwen2.5:7b"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="已加载模型">
              {info?.ollama.models && info.ollama.models.length > 0 ? (
                <Space wrap>
                  {info.ollama.models.map((m) => (
                    <Tag key={m} color="blue">{m}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">{info?.ollama.running ? "未加载模型" : "服务未运行，无法获取模型列表"}</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 数据统计 */}
        <Card className="page-card mb-4" title="数据统计">
          <Descriptions column={2} size="middle">
            <Descriptions.Item label={<span>AI 应用</span>}>
              <Badge count={info?.stats.apps} showZero overflowCount={999} style={{ backgroundColor: "#1890ff" }} />
            </Descriptions.Item>
            <Descriptions.Item label={<span>对话总数</span>}>
              <Badge count={info?.stats.chats} showZero overflowCount={999} style={{ backgroundColor: "#52c41a" }} />
            </Descriptions.Item>
            <Descriptions.Item label={<span>知识文档</span>}>
              <Badge count={info?.stats.docs} showZero overflowCount={999} style={{ backgroundColor: "#722ed1" }} />
            </Descriptions.Item>
            <Descriptions.Item label={<span>工作流</span>}>
              <Badge count={info?.stats.workflows} showZero overflowCount={999} style={{ backgroundColor: "#fa8c16" }} />
            </Descriptions.Item>
            <Descriptions.Item label={<span>工作流执行</span>}>
              <Badge count={info?.stats.executions} showZero overflowCount={999} style={{ backgroundColor: "#13c2c2" }} />
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>
  );
}
