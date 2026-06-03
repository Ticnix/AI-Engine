"use client";

import { Typography, Tag, Space } from "antd";
import { UserOutlined, RobotOutlined, FileTextOutlined } from "@ant-design/icons";

interface Reference {
  source: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  timestamp?: Date;
  isStreaming?: boolean;
  references?: Reference[];
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="message-empty">
        <div className="message-empty-icon">
          <RobotOutlined style={{ fontSize: 48, opacity: 0.3 }} />
        </div>
        <Typography.Text type="secondary">
          选择一个智能体，开始对话吧
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message-item ${
            msg.role === "user" ? "message-user" : "message-assistant"
          }`}
        >
          <div className="message-avatar">
            {msg.role === "user" ? (
              <UserOutlined />
            ) : (
              <RobotOutlined />
            )}
          </div>
          <div
            className={`message-bubble ${
              msg.role === "user"
                ? "message-bubble-user"
                : "message-bubble-assistant"
            }`}
          >
            <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {msg.content}
              {msg.isStreaming && <span className="typing-cursor">▊</span>}
            </Typography.Paragraph>

            {/* 显示参考文档来源 */}
            {msg.role === "assistant" && msg.references && msg.references.length > 0 && !msg.isStreaming && (
              <div style={{ marginTop: 8 }}>
                <Space size={[4, 4]} wrap>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined /> 参考来源:
                  </Typography.Text>
                  {msg.references.map((ref, idx) => (
                    <Tag
                      key={idx}
                      color="blue"
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {ref.source} ({Math.round(ref.similarity * 100)}%)
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {!msg.isStreaming && (msg.timestamp || msg.createdAt) && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginTop: 4 }}
              >
                {new Date(msg.timestamp || msg.createdAt || "").toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography.Text>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="message-item message-assistant">
          <div className="message-avatar">
            <RobotOutlined />
          </div>
          <div className="message-bubble message-bubble-assistant message-loading">
            <span className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}