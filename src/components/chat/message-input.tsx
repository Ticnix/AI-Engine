"use client";

import { Input, Button, Space } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { SendOutlined, ClearOutlined } from "@ant-design/icons";
import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onClear,
  disabled,
  loading,
  placeholder = "输入消息...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<TextAreaRef>(null);

  // 发送后自动聚焦
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const handleSend = () => {
    if (message.trim() && !disabled && !loading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-area">
      <Input.TextArea
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoSize={{ minRows: 1, maxRows: 4 }}
        size="large"
      />
      <Space>
        {onClear && (
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            disabled={disabled}
            size="large"
          >
            清空
          </Button>
        )}
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          loading={loading}
          size="large"
        >
          发送
        </Button>
      </Space>
    </div>
  );
}