"use client";

import { Card, Typography, message as antMessage, Spin } from "antd";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppSelector } from "@/components/chat/app-selector";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { api } from "@/lib/request";

interface App {
  id: string;
  name: string;
  model: string | null;
  prompt?: string | null;
}

interface Reference {
  source: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  references?: Reference[];
}

interface ChatDetail {
  id: string;
  title: string;
  tokens: number;
  messages: Message[];
  app: {
    id: string;
    name: string;
    model: string | null;
  };
}

function ChatContent({ initialAppId, existingChatId }: { initialAppId: string | null; existingChatId: string | null }) {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialAppId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(existingChatId);
  const [totalTokens, setTotalTokens] = useState(0);
  const [chatTitle, setChatTitle] = useState<string>("");

  const messageListRef = useRef<HTMLDivElement>(null);

  const fetchApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await api.get<App[]>("/api/apps");
      setApps(data);
      if (initialAppId && !data.find((app) => app.id === initialAppId)) {
        setSelectedAppId(null);
      }
    } catch {
      antMessage.error("获取智能体列表失败");
    } finally {
      setLoadingApps(false);
    }
  }, [initialAppId]);

  const loadChat = useCallback(async (chatId: string) => {
    try {
      const data = await api.get<ChatDetail>(`/api/chats/${chatId}`);
      setMessages(data.messages || []);
      setTotalTokens(data.tokens || 0);
      setChatTitle(data.title || "");
      setSelectedAppId(data.app?.id || null);
    } catch {
      antMessage.error("加载对话失败");
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  useEffect(() => {
    if (existingChatId) {
      loadChat(existingChatId);
    }
  }, [existingChatId, loadChat]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedAppId) {
      antMessage.warning("请先选择一个智能体");
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
      references: [],
    };
    setMessages((prev) => [...prev, aiMessage]);
    setSendingMessage(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: selectedAppId,
          message: content,
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.type === "token") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                )
              );
            } else if (data.type === "done") {
              setCurrentChatId(data.chatId);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, isStreaming: false, references: data.references || [] }
                    : msg
                )
              );
              if (data.chatId) {
                fetchChatTokens(data.chatId);
              }
            } else if (data.type === "error") {
              antMessage.error(data.error);
              setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : "发送失败");
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchChatTokens = async (chatId: string) => {
    try {
      const data = await api.get<ChatDetail>(`/api/chats/${chatId}`);
      setTotalTokens(data.tokens || 0);
      setChatTitle(data.title || "");
    } catch {
      // 忽略
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setTotalTokens(0);
    setChatTitle("");
  };

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    handleClearChat();
  };

  const selectedApp = apps.find((app) => app.id === selectedAppId);

  return (
    <div className="chat-page">
      <div className="chat-header-area">
        <AppSelector
          apps={apps}
          selectedAppId={selectedAppId}
          onSelect={handleSelectApp}
          onRefresh={fetchApps}
          loading={loadingApps}
        />
      </div>

      <Card className="chat-card">
        <div className="chat-info-bar">
          <Typography.Text>
            {chatTitle || currentChatId
              ? `对话: ${chatTitle || (currentChatId ? currentChatId.slice(0, 8) : "")}...`
              : "新对话"}
          </Typography.Text>
          {totalTokens > 0 && (
            <Typography.Text type="secondary">
              Token 消耗: {totalTokens}
            </Typography.Text>
          )}
        </div>

        <div className="chat-messages" ref={messageListRef}>
          <MessageList messages={messages} loading={false} />
        </div>

        <MessageInput
          onSend={handleSendMessage}
          onClear={handleClearChat}
          disabled={!selectedAppId}
          loading={sendingMessage}
          placeholder={
            selectedApp ? `向 ${selectedApp.name} 发送消息...` : "请先选择智能体"
          }
        />
      </Card>
    </div>
  );
}

export default function NewChatPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center" style={{ minHeight: 400 }}><Spin size="large" /></div>}>
      <InnerNewChatPage />
    </Suspense>
  );
}

function InnerNewChatPage() {
  const searchParams = useSearchParams();
  const initialAppId = searchParams.get("appId");
  const existingChatId = searchParams.get("chatId");

  return <ChatContent initialAppId={initialAppId} existingChatId={existingChatId} />;
}
