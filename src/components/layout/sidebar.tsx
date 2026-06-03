"use client";

import { Menu, Button } from "antd";
import type { MenuProps } from "antd";
import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeOutlined,
  RobotOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  MessageOutlined,
  BookOutlined,
  SearchOutlined,
  DeploymentUnitOutlined,
  BranchesOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [manualOpenKey, setManualOpenKey] = useState<string | null>(null);

  // 根据路径自动计算对应的父菜单
  const pathOpenKey = useMemo(() => {
    if (pathname === "/") return "group-home";
    if (pathname.startsWith("/apps")) return "group-apps";
    if (pathname.startsWith("/chats")) return "group-chats";
    if (pathname.startsWith("/knowledge")) return "group-knowledge";
    if (pathname.startsWith("/flow")) return "group-flow";
    if (pathname.startsWith("/settings")) return "group-settings";
    return "";
  }, [pathname]);

  // 合并路径自动展开和手动展开的逻辑
  const openKeys = collapsed ? [] : [manualOpenKey || pathOpenKey];

  // 菜单配置 - 使用 SubMenu 实现折叠
  // 一级菜单使用 "group-" 开头的 key，二级菜单使用路由路径
  const menuItems: MenuProps["items"] = [
    // 🏠 首页
    {
      key: "group-home",
      icon: <HomeOutlined />,
      label: "首页",
      children: [
        {
          key: "/",
          icon: <HomeOutlined />,
          label: "仪表盘",
        },
      ],
    },
    // 🤖 AI 智能体
    {
      key: "group-apps",
      icon: <RobotOutlined />,
      label: "AI 智能体",
      children: [
        {
          key: "/apps",
          icon: <AppstoreOutlined />,
          label: "智能体列表",
        },
        {
          key: "/apps/new",
          icon: <PlusCircleOutlined />,
          label: "新建智能体",
        },
      ],
    },
    // 💬 对话管理
    {
      key: "group-chats",
      icon: <MessageOutlined />,
      label: "对话管理",
      children: [
        {
          key: "/chats/new",
          icon: <PlusCircleOutlined />,
          label: "新建对话",
        },
        {
          key: "/chats",
          icon: <MessageOutlined />,
          label: "对话历史",
        },
      ],
    },
    // 📚 知识库
    {
      key: "group-knowledge",
      icon: <BookOutlined />,
      label: "知识库",
      children: [
        {
          key: "/knowledge",
          icon: <BookOutlined />,
          label: "文档管理",
        },
        {
          key: "/knowledge/retrieve",
          icon: <SearchOutlined />,
          label: "向量检索",
        },
      ],
    },
    // 🔀 工作流
    {
      key: "group-flow",
      icon: <DeploymentUnitOutlined />,
      label: "工作流",
      children: [
        {
          key: "/flow",
          icon: <DeploymentUnitOutlined />,
          label: "编辑器",
        },
        {
          key: "/flow/my",
          icon: <BranchesOutlined />,
          label: "我的工作流",
        },
      ],
    },
    // ⚙️ 系统
    {
      key: "group-settings",
      icon: <SettingOutlined />,
      label: "系统",
      children: [
        {
          key: "/settings",
          icon: <SettingOutlined />,
          label: "系统设置",
        },
        {
          key: "/settings/profile",
          icon: <MessageOutlined />,
          label: "个人中心",
        },
        {
          key: "/settings/account",
          icon: <AppstoreOutlined />,
          label: "账户设置",
        },
      ],
    },
  ];

  // 点击菜单项
  const handleClick: MenuProps["onClick"] = (e) => {
    // 只对路由路径（不以 group- 开头）执行跳转
    if (!e.key.startsWith("group-")) {
      router.push(e.key);
    }
  };

  // 展开/折叠菜单 - 单开模式
  const onOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    if (latestOpenKey) {
      setManualOpenKey(latestOpenKey);
    } else {
      setManualOpenKey(null);
    }
  };

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* 折叠按钮 */}
      <div className="sidebar-toggle">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          className="toggle-btn"
        />
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[pathname || "/"]}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onClick={handleClick}
        items={menuItems}
        className="sidebar-menu"
        inlineCollapsed={collapsed}
      />
    </aside>
  );
}