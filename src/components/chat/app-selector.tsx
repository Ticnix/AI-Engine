"use client";

import { Select, Button, Space, Typography, Tag } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";

interface App {
  id: string;
  name: string;
  model: string | null;
}

interface AppSelectorProps {
  apps: App[];
  selectedAppId: string | null;
  onSelect: (appId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function AppSelector({
  apps,
  selectedAppId,
  onSelect,
  onRefresh,
  loading,
}: AppSelectorProps) {
  const selectedApp = apps.find((app) => app.id === selectedAppId);

  const options = apps.map((app) => ({
    value: app.id,
    label: `${app.name} (${app.model || "默认"})`,
  }));

  return (
    <div className="chat-selector">
      <Space size="middle">
        <Select
          placeholder="选择智能体开始对话"
          value={selectedAppId}
          onChange={onSelect}
          options={options}
          loading={loading}
          size="large"
          style={{ minWidth: 250 }}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />

        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
          size="large"
        >
          刷新
        </Button>

        <Link href="/apps/new">
          <Button icon={<PlusOutlined />} size="large">
            新建智能体
          </Button>
        </Link>
      </Space>

      {selectedApp && (
        <div className="chat-app-info mt-3">
          <Typography.Text>
            当前智能体：<strong>{selectedApp.name}</strong>
          </Typography.Text>
          <Tag color={selectedApp.model?.includes("gpt-4") ? "purple" : "blue"}>
            {selectedApp.model || "默认"}
          </Tag>
        </div>
      )}
    </div>
  );
}