"use client";

import { Button, Space, Modal, Input, message, Tag } from "antd";
import { SaveOutlined, SendOutlined, PlayCircleOutlined, ArrowLeftOutlined, CloudUploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/request";
import type { Node, Edge } from "reactflow";

interface FlowToolbarProps {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  status: string;
  onWorkflowUpdated: () => void;
  onRun: (body: ReadableStream) => void;
  onCreateWorkflow: (id: string) => void;
}

export function FlowToolbar({
  workflowId,
  nodes,
  edges,
  workflowName,
  status,
  onWorkflowUpdated,
  onRun,
  onCreateWorkflow,
}: FlowToolbarProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newName, setNewName] = useState(workflowName);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (workflowId) {
        // 更新已有工作流
        await api.put(`/api/workflows/${workflowId}`, {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        });
        message.success("保存成功");
      } else {
        // 创建新工作流
        const name = workflowName.trim() || "未命名工作流";
        const wf = await api.post(`/api/workflows`, {
          name,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }) as any;
        onCreateWorkflow(wf.id);
        message.success("创建并保存成功");
      }
      onWorkflowUpdated();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflowId) {
      message.error("请先保存工作流");
      return;
    }
    try {
      await api.put(`/api/workflows/${workflowId}`, { status: "published" });
      message.success("已发布");
      onWorkflowUpdated();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "发布失败");
    }
  };

  const handleRun = async () => {
    if (!workflowId) {
      message.error("请先保存工作流");
      return;
    }
    setRunning(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {},
          // 发送当前画布状态, 避免未保存时执行旧版本
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      onRun(response.body as ReadableStream);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "执行失败");
    } finally {
      setRunning(false);
    }
  };

  const handleRename = async () => {
    if (!workflowId || !newName.trim()) return;
    try {
      await api.put(`/api/workflows/${workflowId}`, { name: newName.trim() });
      message.success("重命名成功");
      setRenameModal(false);
      onWorkflowUpdated();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "重命名失败");
    }
  };

  const statusTag = status === "published"
    ? <Tag color="green">已发布</Tag>
    : status === "draft"
    ? <Tag color="orange">草稿</Tag>
    : <Tag color="default">已归档</Tag>;

  return (
    <div className="flow-toolbar">
      <div className="flow-toolbar-left">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/flow/my")}
          type="text"
        >
          返回
        </Button>
        <div className="flow-toolbar-title" onClick={() => setRenameModal(true)}>
          {workflowName || "未命名工作流"}
          {workflowId ? statusTag : <Tag color="blue">新建</Tag>}
        </div>
        {!workflowId && (
          <span className="flow-toolbar-hint">编辑节点后点击「保存为新工作流」</span>
        )}
      </div>

      <div className="flow-toolbar-right">
        <Space>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            {workflowId ? "保存" : "保存为新工作流"}
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={handlePublish}
            disabled={!workflowId}
          >
            发布
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
            loading={running}
            disabled={!workflowId}
          >
            运行
          </Button>
        </Space>
      </div>

      <Modal
        title="重命名工作流"
        open={renameModal}
        onOk={handleRename}
        onCancel={() => setRenameModal(false)}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="工作流名称"
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
        />
      </Modal>
    </div>
  );
}
