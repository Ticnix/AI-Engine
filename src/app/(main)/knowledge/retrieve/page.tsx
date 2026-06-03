"use client";

import { Card, Input, Button, List, Tag, message, Spin, Empty, Alert } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import { api } from "@/lib/request";

interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  document: {
    id: string;
    originalName: string;
    type: string;
  };
  chunkIndex: number;
  tokenCount: number;
}

export default function RetrievePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      message.warning("请输入查询内容");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await api.post<{ results: SearchResult[]; total: number }>(
        "/api/embeddings",
        {
          query: query.trim(),
          topK: 10,
          threshold: 0.3,
        }
      );
      setResults(data.results || []);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "检索失败";
      setError(errMsg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>向量检索</h1>
      </div>

      <Card className="page-card">
        {/* 说明 */}
        <Alert
          message="功能说明"
          description="向量检索可以搜索知识库中与查询内容语义相似的文档片段。先在知识库上传并向量化文档，然后在这里输入关键词或问题进行检索。"
          type="info"
          showIcon
          className="mb-4"
        />

        {/* 搜索框 */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="输入查询内容，例如：如何创建智能体"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="large"
            onPressEnter={handleSearch}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="large"
            onClick={handleSearch}
            loading={loading}
          >
            搜索
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="检索失败"
            description={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        {/* 结果列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" tip="正在检索..." />
          </div>
        ) : hasSearched && results.length > 0 ? (
          <List
            header={<span className="font-medium">检索结果 ({results.length} 条匹配)</span>}
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag color="blue">{item.document.originalName}</Tag>
                    <Tag color="green">相似度 {Math.round(item.similarity * 100)}%</Tag>
                    <Tag color="default">{item.tokenCount} tokens</Tag>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm leading-relaxed">
                    {item.content.length > 500 ? item.content.slice(0, 500) + "..." : item.content}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : hasSearched && results.length === 0 && !error ? (
          <Empty description="未找到相关内容，请尝试其他关键词" className="py-8" />
        ) : (
          <Empty description="输入关键词开始检索知识库" className="py-8" />
        )}
      </Card>
    </div>
  );
}