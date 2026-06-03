"use client";

import { Card, Form, Input, Button, Divider, Space, message, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/request";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nameForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const u: UserInfo = await res.json();
          setUserName(u.name || "");
          setUserEmail(u.email);
          nameForm.setFieldsValue({ name: u.name || "" });
        } else {
          setAuthError("请先登录后再修改账户信息");
        }
      } catch {
        setAuthError("获取用户信息失败");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleUpdateName = async (values: { name: string }) => {
    setNameLoading(true);
    try {
      const updatedUser = await api.patch<UserInfo>("/api/auth/profile", { name: values.name });
      setUserName(updatedUser.name || "");
      setUserEmail(updatedUser.email);
      message.success("用户名更新成功");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    setPasswordLoading(true);
    try {
      await api.patch("/api/auth/profile", {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success("密码修改成功");
      passwordForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "修改失败");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (authError) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>账户设置</h1>
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
        <h1>账户设置</h1>
      </div>

      <div className="max-w-2xl">
        {/* 当前用户信息 */}
        <Card className="page-card mb-4">
          <div style={{ marginBottom: 8 }}>
            <strong>当前账号：</strong>{userEmail || "未知"}
          </div>
        </Card>

        {/* 修改用户名 */}
        <Card className="page-card mb-4" title="基本信息">
          <Form
            form={nameForm}
            layout="vertical"
            onFinish={handleUpdateName}
          >
            <Form.Item
              name="name"
              label="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={nameLoading}>
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 修改密码 */}
        <Card className="page-card mb-4" title="修改密码">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="oldPassword"
              label="当前密码"
              rules={[{ required: true, message: "请输入当前密码" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入当前密码"
                size="large"
              />
            </Form.Item>

            <Divider>新密码</Divider>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: "请输入新密码" },
                { min: 6, message: "密码长度至少为6位" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码（至少6位）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "请确认新密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("两次输入的密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={passwordLoading} danger>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 快捷操作 */}
        <Card className="page-card" title="快捷操作">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Button block onClick={() => router.push("/settings")}>
              返回系统设置
            </Button>
            <Button block onClick={() => router.push("/")}>
              返回仪表盘
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
}
