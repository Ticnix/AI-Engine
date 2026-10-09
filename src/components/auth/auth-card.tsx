"use client";

import { Tabs, Form, Input, Button, Checkbox, ConfigProvider } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type RegisterFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// Ant Design 日间主题配置
const lightTheme = {
  token: {
    colorPrimary: "#1677ff",
    colorBgContainer: "#ffffff",
    colorBorder: "#d9d9d9",
    colorText: "rgba(0, 0, 0, 0.85)",
    colorTextPlaceholder: "rgba(0, 0, 0, 0.35)",
    borderRadius: 8,
  },
  components: {
    Input: {
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      colorText: "rgba(0, 0, 0, 0.85)",
      colorTextPlaceholder: "rgba(0, 0, 0, 0.35)",
    },
    Button: {
      primaryColor: "#ffffff",
    },
    Tabs: {
      colorText: "rgba(0, 0, 0, 0.45)",
      colorTextActive: "#1677ff",
      inkBarColor: "#1677ff",
    },
    Checkbox: {
      colorPrimary: "#1677ff",
      colorPrimaryHover: "#4096ff",
    },
    Form: {
      labelColor: "rgba(0, 0, 0, 0.7)",
      colorError: "#ff4d4f",
    },
  },
};

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const redirectTo = searchParams.get("from") || "/";

  const handleLogin = async (values: LoginFormValues) => {
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "登录失败");
        setLoginLoading(false);
        return;
      }

      setUser(data);
      router.push(redirectTo);
    } catch {
      setLoginError("网络错误，请稍后重试");
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    setRegisterError("");
    setRegisterLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.error || "注册失败");
        setRegisterLoading(false);
        return;
      }

      setUser(data);
      router.push(redirectTo);
    } catch {
      setRegisterError("网络错误，请稍后重试");
      setRegisterLoading(false);
    }
  };

  const tabItems = [
    {
      key: "login",
      label: "登录",
      children: (
        <Form
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          initialValues={{ rememberMe: false }}
          className="mt-4"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请输入邮箱"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex justify-between items-center">
              <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                <Checkbox>记住密码</Checkbox>
              </Form.Item>
              <a className="auth-link">忘记密码?</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginLoading}
              block
              size="large"
              className="gradient-btn"
            >
              登录
            </Button>
          </Form.Item>

          {loginError && (
            <div className="auth-error text-center">{loginError}</div>
          )}
        </Form>
      ),
    },
    {
      key: "register",
      label: "注册",
      children: (
        <Form
          name="register"
          onFinish={handleRegister}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item name="name">
            <Input
              prefix={<UserOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请输入用户名（可选）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请输入邮箱"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码长度至少为6位" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请输入密码（至少6位）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="请再次输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerLoading}
              block
              size="large"
              className="gradient-btn"
            >
              注册
            </Button>
          </Form.Item>

          {registerError && (
            <div className="auth-error text-center">{registerError}</div>
          )}
        </Form>
      ),
    },
  ];

  return (
    <ConfigProvider theme={lightTheme}>
      <div className="glass-card p-8 w-full max-w-md">
        <h1 className="auth-title">AI 应用引擎</h1>
        <p className="auth-subtitle">登录或注册以开始使用</p>

        <Tabs
          defaultActiveKey="login"
          items={tabItems}
          centered
          className="mt-6 auth-tabs"
        />

        <div className="mt-4 text-center">
          <p className="auth-footer-text">
            登录即表示同意我们的服务条款
          </p>
        </div>
      </div>
    </ConfigProvider>
  );
}