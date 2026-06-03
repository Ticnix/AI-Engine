"use client";

import { Card, Form, Input, Select, Button, Space, message, Spin, Row, Col, Divider } from "antd";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/request";
import DocumentSelector from "@/components/document/document-selector";

const models = [
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
];

interface AppDetail {
  name: string;
  description: string | null;
  model: string | null;
  prompt: string | null;
  workflowId: string | null;
  documents?: {
    id: string;
    documentId: string;
    document: {
      id: string;
      originalName: string;
      type: string;
      status: string;
    };
  }[];
}

interface Document {
  id: string;
  originalName: string;
  type: string;
  status: string;
}

export default function EditAppPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<{ id: string; name: string; status: string }[]>([]);
  const [form] = Form.useForm();

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const data = await api.get<Document[]>("/api/documents");
      const availableDocs = data.filter(
        (doc) => doc.status === "embedding" || doc.status === "completed"
      );
      setDocuments(availableDocs);
    } catch {
      message.error("获取文档列表失败");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await api.get<{ id: string; name: string; status: string }[]>("/api/workflows");
      setWorkflows(data.filter((w) => w.status === "published"));
    } catch {
      // 忽略
    }
  }, []);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AppDetail>(`/api/apps/${appId}`);
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        model: data.model || "gpt-3.5-turbo",
        prompt: data.prompt,
        workflowId: data.workflowId,
      });
      if (data.documents && data.documents.length > 0) {
        setSelectedDocIds(data.documents.map((d) => d.documentId));
      }
    } catch {
      message.error("获取智能体信息失败");
      router.push("/apps");
    } finally {
      setLoading(false);
    }
  }, [appId, form, router]);

  useEffect(() => {
    fetchDocuments();
    fetchWorkflows();
  }, [fetchDocuments, fetchWorkflows]);

  useEffect(() => {
    if (appId) {
      fetchApp();
    }
  }, [appId, fetchApp]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    model: string;
    prompt?: string;
    workflowId?: string;
  }) => {
    setSubmitting(true);
    try {
      await api.put(`/api/apps/${appId}`, {
        ...values,
        documentIds: selectedDocIds,
        workflowId: values.workflowId || null,
      });
      message.success("更新成功");
      router.push("/apps");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center" style={{ minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>编辑智能体</h1>
      </div>

      <Card className="page-card">
        <Row gutter={24}>
          {/* 左侧：基本信息 */}
          <Col span={14}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="name"
                label="智能体名称"
                rules={[{ required: true, message: "请输入智能体名称" }]}
              >
                <Input placeholder="例如：智能客服助手" size="large" />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea
                  rows={2}
                  placeholder="简要描述智能体的功能和用途"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="model"
                label="选择模型"
                rules={[{ required: true, message: "请选择模型" }]}
              >
                <Select placeholder="选择 AI 模型" options={models} size="large" />
              </Form.Item>

              <Form.Item name="workflowId" label="关联工作流">
                <Select
                  placeholder="选择一个工作流（可选）"
                  size="large"
                  allowClear
                  options={workflows.map((w) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>

              <Form.Item name="prompt" label="系统提示词">
                <Input.TextArea
                  rows={6}
                  placeholder="输入系统提示词，定义智能体的角色和行为..."
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    size="large"
                  >
                    保存修改
                  </Button>
                  <Button onClick={() => router.back()} size="large">
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Col>

          {/* 右侧：关联文档 */}
          <Col span={10}>
            <Divider>关联知识库文档</Divider>
            <DocumentSelector
              documents={documents}
              selectedDocIds={selectedDocIds}
              onChange={setSelectedDocIds}
              loading={loadingDocs}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}