"use client";

import { Card, Table, Button, Space, Tag, Upload, Modal, message, Popconfirm, Spin } from "antd";
import { UploadOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, ReloadOutlined, ThunderboltOutlined, SyncOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { UploadProps } from "antd";
import { useEffect, useState } from "react";
import { api } from "@/lib/request";
import { DocumentPreviewModal } from "@/components/document/document-preview-modal";

interface Document {
  id: string;
  originalName: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 状态映射
const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: "orange", text: "待处理" },
  processing: { color: "blue", text: "处理中" },
  completed: { color: "green", text: "已解析" },
  embedding: { color: "cyan", text: "已向量化" },
  error: { color: "red", text: "失败" },
};

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; id: string; name: string }>({
    visible: false,
    id: "",
    name: "",
  });
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; id: string; name: string }>({
    visible: false,
    id: "",
    name: "",
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 轮询：当有待处理/处理中的文档时自动刷新列表
  useEffect(() => {
    const hasActiveDocs = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!hasActiveDocs) return;

    const timer = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(timer);
  }, [documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.get<Document[]>("/api/documents");
      setDocuments(data);
    } catch {
      message.error("获取文档列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 上传配置
  const uploadProps: UploadProps = {
    accept: ".pdf,.md,.markdown",
    showUploadList: false,
    beforeUpload: async (file) => {
      // 验证文件类型
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isMd = file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".markdown");

      if (!isPdf && !isMd) {
        message.error("仅支持 PDF 和 Markdown 文件");
        return false;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        message.error("文件大小不能超过 10MB");
        return false;
      }

      setUploading(true);
      try {
        await api.upload("/api/documents", file);
        message.success("上传成功");
        fetchDocuments();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "上传失败");
      } finally {
        setUploading(false);
      }

      return false; // 阻止默认上传行为
    },
  };

  // 删除文档
  const handleDelete = async () => {
    try {
      await api.delete(`/api/documents/${deleteModal.id}`);
      message.success("删除成功");
      setDeleteModal({ visible: false, id: "", name: "" });
      fetchDocuments();
    } catch {
      message.error("删除失败");
    }
  };

  // 处理文档（分块 + 向量化）
  const handleProcess = async (id: string) => {
    setProcessingIds((prev) => [...prev, id]);
    try {
      const result = await api.post<{ totalChunks: number; processedChunks: number }>(
        `/api/embeddings/process/${id}`
      );
      message.success(`向量化完成，共 ${result.totalChunks} 个分块`);
      fetchDocuments();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "向量化失败");
    } finally {
      setProcessingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // 重新解析文档
  const handleParse = async (id: string) => {
    setProcessingIds((prev) => [...prev, id]);
    try {
      // 触发预览接口会自动解析 pending 状态的文档
      await api.get(`/api/documents/${id}`);
      message.success("解析完成");
      fetchDocuments();
    } catch {
      message.error("解析失败");
    } finally {
      setProcessingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: "文件名",
      dataIndex: "originalName",
      key: "originalName",
      width: 250,
      ellipsis: true,
      render: (name: string, record) => (
        <Space>
          <FileTextOutlined style={{ color: record.type === "pdf" ? "#ff4d4f" : "#52c41a" }} />
          <span className="font-medium">{name}</span>
        </Space>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 80,
      render: (type: string) => (
        <Tag color={type === "pdf" ? "red" : "green"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => {
        const isProcessing = status === "processing";
        return (
          <Tag color={statusMap[status]?.color || "default"}>
            {isProcessing && <Spin size="small" style={{ marginRight: 4, fontSize: 10 }} />}
            {statusMap[status]?.text || status}
          </Tag>
        );
      },
    },
    {
      title: "上传时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => setPreviewModal({ visible: true, id: record.id, name: record.originalName })}
          >
            预览
          </Button>
          {(record.status === "pending" || record.status === "error") && (
            <Button
              type="link"
              icon={<SyncOutlined />}
              size="small"
              loading={processingIds.includes(record.id)}
              onClick={() => handleParse(record.id)}
            >
              解析
            </Button>
          )}
          {record.status === "completed" && (
            <Popconfirm
              title="确认向量化？"
              description="将文档分块并生成向量嵌入，用于智能检索"
              onConfirm={() => handleProcess(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                icon={<ThunderboltOutlined />}
                size="small"
                loading={processingIds.includes(record.id)}
              >
                向量化
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => setDeleteModal({ visible: true, id: record.id, name: record.originalName })}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>知识库文档管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchDocuments} loading={loading}>
            刷新
          </Button>
          <Upload {...uploadProps}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
              上传文档
            </Button>
          </Upload>
        </Space>
      </div>

      <Card className="page-card">
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          tableLayout="fixed"
        />
      </Card>

      {/* 预览弹窗 */}
      <DocumentPreviewModal
        visible={previewModal.visible}
        documentId={previewModal.id}
        documentName={previewModal.name}
        onClose={() => setPreviewModal({ visible: false, id: "", name: "" })}
      />

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, id: "", name: "" })}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除文档 <strong>{deleteModal.name}</strong> 吗？
        </p>
        <p className="text-gray-500">删除后文件将被永久删除，此操作不可恢复。</p>
      </Modal>
    </div>
  );
}