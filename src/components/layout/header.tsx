"use client";

import { Input, Button, Avatar, Dropdown, Space } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export function Header() {
  const { logout } = useAuthStore();
  const router = useRouter();

  // 用户菜单项
  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人中心",
      onClick: () => router.push("/settings/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "账户设置",
      onClick: () => router.push("/settings/account"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      danger: true,
      onClick: () => {
        logout();
        router.push("/login");
      },
    },
  ];

  return (
    <header className="app-header">
      {/* 左侧：Logo + 名称 */}
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <span className="logo-text">AI 应用引擎</span>
        </div>
      </div>

      {/* 中间：全局搜索框 */}
      <div className="header-center">
        <Input
          placeholder="搜索应用、知识库、对话..."
          prefix={<SearchOutlined />}
          className="global-search"
          allowClear
        />
      </div>

      {/* 右侧：用户头像 */}
      <div className="header-right">
        <Space size={12}>
          {/* 用户头像 / 菜单 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Avatar
              size={32}
              icon={<UserOutlined />}
              className="user-avatar cursor-pointer"
            />
          </Dropdown>
        </Space>
      </div>
    </header>
  );
}
