"use client";

import { Modal, Spin, Alert, Empty } from "antd";
import ReactMarkdown from "react-markdown";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/request";

interface DocumentDetail {
  id: string;
  originalName: string;
  type: string;
  content: string | null;
  status: string;
  error: string | null;
}

interface DocumentPreviewModalProps {
  visible: boolean;
  documentId: string;
  documentName: string;
  onClose: () => void;
}

export function DocumentPreviewModal({
  visible,
  documentId,
  documentName,
  onClose,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DocumentDetail>(`/api/documents/${documentId}`);
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取文档失败");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (visible && documentId) {
      fetchDocument();
    } else {
      // 关闭时清空状态
      setDocument(null);
      setError(null);
    }
  }, [visible, documentId, fetchDocument]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" tip="正在解析文档..." />
        </div>
      );
    }

    if (error) {
      return <Alert type="error" message={error} />;
    }

    if (!document) {
      return <Empty description="文档不存在" />;
    }

    if (document.status === "error") {
      return (
        <Alert
          type="error"
          message="文档解析失败"
          description={document.error || "未知错误"}
        />
      );
    }

    if (document.status === "processing") {
      return (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" tip="正在解析文档..." />
        </div>
      );
    }

    if (!document.content) {
      return <Empty description="文档内容为空" />;
    }

    // PDF 纯文本预览
    if (document.type === "pdf") {
      return (
        <div className="document-content-preview">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed overflow-auto max-h-[60vh] p-4 bg-black/20 rounded-lg">
            {document.content}
          </pre>
        </div>
      );
    }

    // Markdown 渲染预览
    if (document.type === "md") {
      return (
        // 外层容器 + ReactMarkdown 一起改
        <div 
          className="markdown-preview overflow-auto max-h-[60vh] p-4 bg-white rounded-lg border border-gray-200"
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mb-3 text-gray-800">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium mb-2 text-gray-800">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm">
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="bg-gray-50 p-3 rounded-lg mb-4 overflow-x-auto border border-gray-200">
                    <code className="text-gray-800 font-mono text-sm">{children}</code>
                  </pre>
                );
              },
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 text-gray-700">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 text-gray-700">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 bg-gray-50 italic text-gray-600">
                  {children}
                </blockquote>
              ),
            }}
          >
            {document.content}
          </ReactMarkdown>
        </div>
      );
    }

    return <Empty description="不支持的文档类型" />;
  };

  return (
    <Modal
      title={`预览: ${documentName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{
        body: { maxHeight: "70vh", overflow: "auto" },
      }}
    >
      {renderContent()}
    </Modal>
  );
}