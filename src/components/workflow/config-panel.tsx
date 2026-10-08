"use client";

import { Input, Select, InputNumber, Button, Empty, Slider, Tag } from "antd";
import { useState, useEffect } from "react";
import type { Node } from "reactflow";

const { TextArea } = Input;

interface ConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, updates: Partial<Node["data"]>) => void;
  apps: { id: string; name: string }[];
  documents: { id: string; originalName: string }[];
  workflows: { id: string; name: string }[];
}

export function ConfigPanel({ node, onUpdate, apps, documents, workflows }: ConfigPanelProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (node) {
      setLabel((node.data as any).label || "");
    }
  }, [node?.id]);

  if (!node) {
    return (
      <div className="config-panel">
        <div className="config-panel-empty">
          <Empty description="点击节点进行配置" />
        </div>
      </div>
    );
  }

  const config = (node.data as any).config || {};

  const handleLabelChange = (value: string) => {
    setLabel(value);
    onUpdate(node.id, { label: value });
  };

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate(node.id, { config: { ...config, [key]: value } });
  };

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <h3>节点配置</h3>
      </div>

      <div className="config-panel-body">
        {/* 节点名称 */}
        <div className="config-field">
          <label>节点名称</label>
          <Input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="节点显示名称"
          />
        </div>

        {/* 根据节点类型显示不同配置 */}
        {node.type === "trigger" && <TriggerConfig config={config} onChange={handleConfigChange} />}
        {node.type === "llm" && <LLMConfig config={config} onChange={handleConfigChange} apps={apps} />}
        {node.type === "retrieval" && <RetrievalConfig config={config} onChange={handleConfigChange} />}
        {node.type === "condition" && <ConditionConfig config={config} onChange={handleConfigChange} />}
        {node.type === "output" && <OutputConfig config={config} onChange={handleConfigChange} />}
        {node.type === "http" && <HTTPConfig config={config} onChange={handleConfigChange} />}
        {node.type === "intent" && <IntentConfig config={config} onChange={handleConfigChange} apps={apps} />}
        {node.type === "subworkflow" && <SubworkflowConfig config={config} onChange={handleConfigChange} workflows={workflows} />}
        {node.type === "code" && <CodeConfig config={config} onChange={handleConfigChange} />}
        {node.type === "message" && <MessageConfig config={config} onChange={handleConfigChange} />}
        {node.type === "loop" && <LoopConfig config={config} onChange={handleConfigChange} />}
        {node.type === "varset" && <VarsetConfig config={config} onChange={handleConfigChange} />}
        {node.type === "texttemplate" && <TextTemplateConfig config={config} onChange={handleConfigChange} />}
      </div>
    </div>
  );
}

function TriggerConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="config-field">
      <label>输入描述</label>
      <TextArea
        value={(config.description as string) || ""}
        onChange={(e) => onChange("description", e.target.value)}
        placeholder="描述工作流需要的输入数据"
        rows={3}
      />
    </div>
  );
}

function LLMConfig({ config, onChange, apps }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void; apps: { id: string; name: string }[] }) {
  return (
    <>
      <div className="config-field">
        <label>模型</label>
        <Input
          value={(config.model as string) || "glm-4.5-flash"}
          onChange={(e) => onChange("model", e.target.value)}
          placeholder="智谱模型名称（如 glm-4.5-flash）"
        />
      </div>
      <div className="config-field">
        <label>系统提示词</label>
        <TextArea
          value={(config.systemPrompt as string) || ""}
          onChange={(e) => onChange("systemPrompt", e.target.value)}
          placeholder="系统角色设定, 支持 {{变量}}"
          rows={3}
        />
      </div>
      <div className="config-field">
        <label>用户提示词 *</label>
        <TextArea
          value={(config.userPrompt as string) || ""}
          onChange={(e) => onChange("userPrompt", e.target.value)}
          placeholder="用户输入, 支持 {{nodeId.output.xxx}}"
          rows={3}
        />
      </div>
      <div className="config-field">
        <label>Temperature</label>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={(config.temperature as number) || 0.7}
          onChange={(v) => onChange("temperature", v)}
        />
      </div>
    </>
  );
}

function RetrievalConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>查询语句 *</label>
        <TextArea
          value={(config.query as string) || ""}
          onChange={(e) => onChange("query", e.target.value)}
          placeholder="搜索查询, 支持 {{变量}}"
          rows={2}
        />
      </div>
      <div className="config-field">
        <label>返回数量 (Top K)</label>
        <InputNumber
          min={1}
          max={20}
          value={(config.topK as number) || 5}
          onChange={(v) => onChange("topK", v)}
          style={{ width: "100%" }}
        />
      </div>
      <div className="config-field">
        <label>相似度阈值</label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={(config.threshold as number) || 0.3}
          onChange={(v) => onChange("threshold", v)}
        />
      </div>
    </>
  );
}

function ConditionConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="config-field">
      <label>条件表达式 *</label>
      <TextArea
        value={(config.expression as string) || ""}
        onChange={(e) => onChange("expression", e.target.value)}
        placeholder={'如: {{llm_1.output.confidence < 0.7}}'}
        rows={3}
      />
      <div className="text-xs text-gray-400 mt-1">
        支持比较运算: {'< > <= >= == !='}, 逻辑运算: {'&& ||'}
      </div>
    </div>
  );
}

function OutputConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>输出模板 *</label>
        <TextArea
          value={(config.template as string) || ""}
          onChange={(e) => onChange("template", e.target.value)}
          placeholder="输出内容, 支持 Markdown + {{变量}}"
          rows={5}
        />
      </div>
      <div className="config-field">
        <label>输出格式</label>
        <Select
          value={(config.format as string) || "text"}
          onChange={(v) => onChange("format", v)}
          style={{ width: "100%" }}
          options={[
            { label: "文本", value: "text" },
            { label: "Markdown", value: "markdown" },
            { label: "JSON", value: "json" },
          ]}
        />
      </div>
    </>
  );
}

function HTTPConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>请求方法</label>
        <Select
          value={(config.method as string) || "GET"}
          onChange={(v) => onChange("method", v)}
          style={{ width: "100%" }}
          options={[
            { label: "GET", value: "GET" },
            { label: "POST", value: "POST" },
            { label: "PUT", value: "PUT" },
            { label: "DELETE", value: "DELETE" },
          ]}
        />
      </div>
      <div className="config-field">
        <label>URL *</label>
        <Input
          value={(config.url as string) || ""}
          onChange={(e) => onChange("url", e.target.value)}
          placeholder="https://api.example.com/data"
        />
      </div>
      <div className="config-field">
        <label>请求头 (JSON)</label>
        <TextArea
          value={(config.headers as string) || ""}
          onChange={(e) => onChange("headers", e.target.value)}
          placeholder='{"Authorization": "Bearer {{token}}"}'
          rows={2}
        />
      </div>
      <div className="config-field">
        <label>请求体</label>
        <TextArea
          value={(config.body as string) || ""}
          onChange={(e) => onChange("body", e.target.value)}
          placeholder='{"key": "{{variable}}"}'
          rows={3}
        />
      </div>
    </>
  );
}

// ===== 新增节点配置组件 =====

function IntentConfig({ config, onChange, apps }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void; apps: { id: string; name: string }[] }) {
  return (
    <>
      <div className="config-field">
        <label>模型</label>
        <Input
          value={(config.model as string) || "glm-4.5-flash"}
          onChange={(e) => onChange("model", e.target.value)}
          placeholder="智谱模型名称（如 glm-4.5-flash）"
        />
      </div>
      <div className="config-field">
        <label>用户输入 *</label>
        <TextArea
          value={(config.userPrompt as string) || ""}
          onChange={(e) => onChange("userPrompt", e.target.value)}
          placeholder="待分析的用户输入, 支持 {{变量}}"
          rows={3}
        />
      </div>
      <div className="config-field">
        <label>意图类别 (JSON 数组) *</label>
        <TextArea
          value={(config.categories as string) || '["咨询", "投诉", "建议"]'}
          onChange={(e) => onChange("categories", e.target.value)}
          placeholder='["咨询", "投诉", "建议"]'
          rows={2}
        />
        <div className="text-xs text-gray-400 mt-1">
          JSON 格式的类别列表
        </div>
      </div>
      <div className="config-field">
        <label>Temperature</label>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={(config.temperature as number) || 0.3}
          onChange={(v) => onChange("temperature", v)}
        />
      </div>
    </>
  );
}

function SubworkflowConfig({ config, onChange, workflows }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void; workflows: { id: string; name: string }[] }) {
  return (
    <>
      <div className="config-field">
        <label>子工作流 *</label>
        <Select
          value={(config.workflowId as string) || undefined}
          onChange={(v) => onChange("workflowId", v)}
          style={{ width: "100%" }}
          placeholder="选择要调用的工作流"
          options={workflows.map((w) => ({ label: w.name, value: w.id }))}
        />
      </div>
      <div className="config-field">
        <label>输入映射 (JSON)</label>
        <TextArea
          value={(config.inputMapping as string) || "{}"}
          onChange={(e) => onChange("inputMapping", e.target.value)}
          placeholder='{"query": "{{trigger_1.output.question}}"}'
          rows={3}
        />
        <div className="text-xs text-gray-400 mt-1">
          将上游输出映射为子工作流输入
        </div>
      </div>
    </>
  );
}

function CodeConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>JavaScript 代码 *</label>
        <TextArea
          value={(config.code as string) || ""}
          onChange={(e) => onChange("code", e.target.value)}
          placeholder={`// 可用变量:\n// inputs - 工作流输入\n// outputs - 前置节点输出\n\nconst result = {\n  processed: inputs.question.toUpperCase(),\n};\n\nreturn result;`}
          rows={8}
          style={{ fontFamily: "monospace", fontSize: "13px" }}
        />
        <div className="text-xs text-gray-400 mt-1">
          返回值赋值给 <code>result</code> 变量，将作为节点输出
        </div>
      </div>
    </>
  );
}

function MessageConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>消息渠道</label>
        <Select
          value={(config.channel as string) || "webhook"}
          onChange={(v) => onChange("channel", v)}
          style={{ width: "100%" }}
          options={[
            { label: "Webhook", value: "webhook" },
            { label: "邮件", value: "email" },
          ]}
        />
      </div>
      <div className="config-field">
        <label>接收方 *</label>
        <Input
          value={(config.to as string) || ""}
          onChange={(e) => onChange("to", e.target.value)}
          placeholder="邮箱地址或接收方标识"
        />
      </div>
      <div className="config-field">
        <label>主题</label>
        <Input
          value={(config.subject as string) || ""}
          onChange={(e) => onChange("subject", e.target.value)}
          placeholder="消息主题"
        />
      </div>
      <div className="config-field">
        <label>消息内容 *</label>
        <TextArea
          value={(config.content as string) || ""}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder="消息内容, 支持 {{变量}}"
          rows={4}
        />
      </div>
      {(config.channel as string) === "webhook" && (
        <div className="config-field">
          <label>Webhook URL</label>
          <Input
            value={(config.webhookUrl as string) || ""}
            onChange={(e) => onChange("webhookUrl", e.target.value)}
            placeholder="https://hooks.example.com/notify"
          />
        </div>
      )}
    </>
  );
}

function LoopConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="config-field">
      <label>迭代器 *</label>
      <Input
        value={(config.iterator as string) || ""}
        onChange={(e) => onChange("iterator", e.target.value)}
        placeholder='{{retrieval_1.output.items}}'
      />
      <div className="text-xs text-gray-400 mt-1">
        引用上游节点返回的数组, 格式: {'{{nodeId.output.fieldName}}'}
      </div>
    </div>
  );
}

function VarsetConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="config-field">
        <label>变量名 *</label>
        <Input
          value={(config.variableName as string) || ""}
          onChange={(e) => onChange("variableName", e.target.value)}
          placeholder="myVariable"
        />
      </div>
      <div className="config-field">
        <label>值表达式 *</label>
        <Input
          value={(config.expression as string) || ""}
          onChange={(e) => onChange("expression", e.target.value)}
          placeholder='{{llm_1.output.answer}} 或 "固定值"'
        />
        <div className="text-xs text-gray-400 mt-1">
          支持变量引用或直接赋值
        </div>
      </div>
    </>
  );
}

function TextTemplateConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="config-field">
      <label>模板内容 *</label>
      <TextArea
        value={(config.template as string) || ""}
        onChange={(e) => onChange("template", e.target.value)}
        placeholder={`尊敬的 {{userName}}:\n\n根据您的需求，我们为您找到了以下结果：\n{{retrieval_1.output.summary}}\n\n如有疑问，请随时联系我们。`}
        rows={6}
      />
      <div className="text-xs text-gray-400 mt-1">
        使用 {'{{变量名}}'} 引用上游节点输出
      </div>
    </div>
  );
}
