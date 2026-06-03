# API 接口总览

本项目所有后端接口都是 Next.js App Router 的 Route Handler，位于 `src/app/api/` 目录下。每个路由文件对应一个 API 端点。

## 一、接口分组

| 分组 | 路径前缀 | 文件数 | 功能 |
|------|----------|--------|------|
| 认证 | `/api/auth/*` | 5 | 登录、注册、登出、用户信息 |
| 智能体 | `/api/apps/*` | 2 | 智能体 CRUD |
| 对话 | `/api/chats/*` + `/api/chat` | 4 | 对话管理 + 核心对话 |
| 知识库 | `/api/documents/*` | 2 | 文档管理 |
| 向量 | `/api/embeddings/*` | 2 | 向量检索 + 向量化处理 |
| 工作流 | `/api/workflows/*` | 6 | 工作流 CRUD + 执行 |
| 用户 | `/api/users/*` + `/api/user/*` | 2 | 用户列表 + 统计 |
| 系统 | `/api/dashboard/*` + `/api/health` + `/api/settings/*` | 3 | 仪表盘 + 健康检查 + 设置 |

## 二、认证接口

### POST /api/auth/login — 登录

```
请求体:
{
  "email": "user@example.com",
  "password": "123456",
  "rememberMe": true
}

成功响应 (200):
{
  "id": "clxxx...",
  "email": "user@example.com",
  "name": "张三",
  "createdAt": "2024-..."
}
→ 同时设置 auth_session Cookie

失败响应 (401):
{ "error": "邮箱或密码错误" }
```

### POST /api/auth/register — 注册

```
请求体:
{
  "email": "new@example.com",
  "password": "123456",
  "name": "新用户"
}

成功响应 (201):
{ "id": "...", "email": "...", "name": "..." }
→ 同时设置 auth_session Cookie（自动登录）

失败响应 (400):
{ "error": "该邮箱已被注册" }
```

### POST /api/auth/logout — 登出

```
无请求体
→ 删除 auth_session Cookie

响应 (200):
{ "message": "已成功登出" }
```

### GET /api/auth/me — 当前用户

```
无请求体
→ 通过 auth_session Cookie 识别

成功响应 (200):
{ "id": "...", "email": "...", "name": "..." }

未登录 (401):
{ "error": "未登录" }
```

### PATCH /api/auth/profile — 修改资料

```
请求体 (修改密码):
{
  "oldPassword": "123456",
  "newPassword": "newpassword"
}

请求体 (修改名称/邮箱):
{
  "name": "新名称",
  "email": "new@email.com"
}

→ 需要已登录
→ 密码修改需要验证旧密码
→ 新密码必须 >= 6 位
```

## 三、智能体接口

### GET /api/apps — 智能体列表

```
→ 需要已登录

响应 (200):
[
  {
    "id": "...",
    "name": "客服助手",
    "description": "处理客户咨询",
    "model": "qwen2.5:7b",
    "_count": { "chats": 5 },
    "createdAt": "..."
  }
]
```

### POST /api/apps — 创建智能体

```
请求体:
{
  "name": "客服助手",
  "description": "处理客户咨询",
  "prompt": "你是一个专业的客服...",
  "model": "qwen2.5:7b",
  "workflowId": null,
  "documentIds": ["clxxx1", "clxxx2"]
}

→ documentIds 可选，用于关联知识库
→ 自动关联到当前用户

响应 (201): { 新建的 App 对象 }
```

### GET /api/apps/[id] — 智能体详情

```
响应 (200):
{
  "id": "...",
  "name": "...",
  "chats": [ ... ],          // 最近 10 个对话
  "documents": [              // 关联的知识库文档
    {
      "id": "...",
      "document": { "id": "...", "name": "...", "status": "..." }
    }
  ]
}
```

### PUT /api/apps/[id] — 更新智能体

```
请求体: 同 POST
→ 文档关联采用增量更新（对比新旧 documentIds）
→ 仅智能体创建者可操作
```

### DELETE /api/apps/[id] — 删除智能体

```
→ 仅智能体创建者可操作
→ 级联删除 AppDocument 关联
→ 不级联删除 Chat（保留对话记录）
```

## 四、对话接口

### GET /api/chats — 对话列表

```
→ 需要已登录
→ 仅返回用户拥有的智能体关联的对话

响应 (200):
[
  {
    "id": "...",
    "title": "关于 Docker 的讨论",
    "app": { "name": "技术助手" },
    "_count": { "messages": 12 },
    "totalTokens": 4500,
    "createdAt": "..."
  }
]
```

### GET /api/chats/[id] — 对话详情

```
响应 (200):
{
  "id": "...",
  "title": "...",
  "app": { ... },
  "messages": [
    { "role": "user", "content": "你好", "createdAt": "..." },
    { "role": "assistant", "content": "你好！", "createdAt": "..." }
  ]
}
→ 需要是智能体创建者
```

### DELETE /api/chats/[id] — 删除对话

```
→ 通过检查对话所属智能体的 owner 来验证权限
→ 级联删除所有 Message
```

### GET /api/chats/[id]/messages — 消息列表

```
→ 获取某个对话的所有消息，按时间升序
→ 用于对话页面加载历史
```

### POST /api/chat — 核心对话（SSE 流式）

这是整个项目最重要的接口。

```
请求体:
{
  "appId": "clxxx...",
  "chatId": "clxxx...",       // 可选
  "messages": [               // 完整对话历史 + 最新消息
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好！" },
    { "role": "user", "content": "介绍一下 Docker" }
  ]
}

响应: SSE 流

data: {"type":"token","content":"Docker"}
data: {"type":"token","content":" 是"}
data: {"type":"token","content":"一个"}
...
data: {"type":"done","chatId":"clxxx","references":["文档A"]}
data: {"type":"error","message":"..."}  // 如果出错
```

### 执行流程

```
1. 验证 app 存在 + 所有权
2. 检查 Ollama 状态
   - 未运行 → 返回 mock 响应
3. 创建/加载 Chat
   - 新对话：创建 Chat 记录，生成标题（取第一条消息前50字）
   - 旧对话：加载已有 Chat
4. 保存用户消息到 Message 表
5. RAG 检索（如果智能体绑定了知识库）
   - 获取所有关联文档的 DocumentChunk
   - 用户输入向量化
   - 计算余弦相似度 → 取 top 相关片段
   - 拼接到 system prompt
6. 工作流执行（如果智能体绑定了 workflow）
   - 执行工作流引擎
   - 如果有输出 → 流式返回
   - 如果无输出 → 降级为普通 LLM
7. 普通 LLM
   - 构建 messages: [system_prompt + RAG上下文, ...历史, 最新]
   - streamChat → Ollama 流式
   - 逐 chunk yield "token" 事件
8. 保存 AI 回复 + 更新 Token 统计
9. 发送 "done" 事件
```

## 五、知识库接口

### GET /api/documents — 文档列表

```
→ 需要已登录
→ 返回当前用户的所有文档

响应 (200):
[
  {
    "id": "...",
    "name": "Docker入门.pdf",
    "status": "embedding",
    "format": "pdf",
    "createdAt": "..."
  }
]
```

### POST /api/documents — 上传文件

```
请求: FormData
  file: File (PDF/MD, ≤ 10MB)

→ 保存到 uploads/documents/ 目录
→ 创建 Document 记录（status = "pending"）
→ 异步触发解析（不阻塞响应）

响应 (201):
{ "id": "...", "name": "...", "status": "pending", ... }
```

### GET /api/documents/[id] — 文档详情

```
→ 如果文档状态为 "pending"，触发延迟解析
→ 返回文档信息（含 content 字段）
```

### DELETE /api/documents/[id] — 删除文档

```
→ 删除 uploads/ 下的物理文件
→ 级联删除 DocumentChunk
→ 删除 AppDocument 关联
→ 删除 Document 记录
```

## 六、向量接口

### POST /api/embeddings — 向量检索

```
请求体:
{
  "query": "什么是容器化？",
  "topK": 10,
  "threshold": 0.3
}

流程:
1. 将 query 向量化
2. 查询所有 DocumentChunk
3. 计算余弦相似度
4. 过滤 < threshold
5. 排序取 top K

响应 (200):
[
  {
    "document": { "id": "...", "name": "Docker入门.pdf" },
    "content": "容器化是一种...",
    "similarity": 0.85,
    "tokenCount": 234
  }
]
```

### POST /api/embeddings/process/[id] — 文档向量化

```
→ 读取文档内容（如果尚未解析，先解析）
→ chunkText() 分块
→ 批量 getEmbeddings() 向量化
→ 存入 DocumentChunk 表
→ 更新 Document.status = "embedding"

→ 此操作可能耗时较长（取决于文档大小和 Ollama 性能）
```

## 七、工作流接口

### GET /api/workflows — 工作流列表

```
响应 (200):
[
  {
    "id": "...",
    "name": "客服流程",
    "description": "...",
    "status": "published",
    "_count": { executions: 15 },
    "nodes": [...],            // 节点数量
    "updatedAt": "..."
  }
]
```

### POST /api/workflows — 创建工作流

```
请求体:
{
  "name": "新流程",
  "description": "描述"
}

→ 初始状态为 "draft"
→ nodes 和 edges 为空数组

响应 (201): { 新建的 Workflow 对象 }
```

### GET /api/workflows/[id] — 工作流详情

```
响应 (200):
{
  "id": "...",
  "name": "...",
  "nodes": [...],        // 完整的画布节点
  "edges": [...],        // 完整的连线
  "recentExecutions": [  // 最近的执行记录
    { "id": "...", "status": "success", "startedAt": "..." }
  ]
}
```

### PUT /api/workflows/[id] — 更新工作流

```
请求体:
{
  "name": "新名称",           // 可选
  "description": "...",       // 可选
  "nodes": [...],             // 可选，完整画布
  "edges": [...],             // 可选，完整连线
  "status": "published"       // 可选
}
```

### DELETE /api/workflows/[id] — 删除工作流

```
→ 仅创建者可操作
→ 不级联删除执行记录
```

### POST /api/workflows/[id]/execute — 同步执行

```
请求体:
{
  "inputs": { ... }          // 触发器输入
}

→ 等待工作流完全执行完毕
→ 返回最终输出
→ 适合不需要实时进度的场景

响应 (200):
{
  "output": { ... },
  "executionId": "..."
}
```

### POST /api/workflows/[id]/execute/stream — SSE 流式执行

```
请求体:
{
  "inputs": { ... },
  "nodes": [...],             // 可选，覆盖 DB 中的定义
  "edges": [...]              // 可选，覆盖 DB 中的定义
}

响应: SSE 流

event: start
data: {"workflowId":"...","executionId":"..."}

event: node
data: {"nodeId":"trigger-1","type":"trigger","status":"running"}

event: data
data: {"nodeId":"trigger-1","data":{"input":"..."}}

event: layer
data: {"layerIndex":1,"totalLayers":3}

event: done
data: {"output":{"output-1":{"content":"结果"}}}

→ 5 分钟超时
→ 每 200ms 轮询一次事件数组
```

### GET /api/workflows/[id]/executions — 执行历史

```
→ 返回最近 50 条执行记录
→ 每条包含 nodeExecutions 详情
```

### GET /api/workflows/[id]/executions/[execId] — 执行详情

```
响应 (200):
{
  "id": "...",
  "status": "success",
  "input": {...},
  "output": {...},
  "startedAt": "...",
  "completedAt": "...",
  "workflow": { "name": "...", "userId": "..." },
  "nodeExecutions": [
    {
      "nodeId": "llm-1",
      "nodeType": "llm",
      "status": "success",
      "input": {...},
      "output": {"content": "...", "model": "..."},
      "startedAt": "...",
      "completedAt": "..."
    }
  ]
}
```

### POST /api/workflows/executions/[execId] — 取消执行

```
→ 标记执行状态为 "cancelled"
→ TODO: 实际实现 AbortController 中断正在运行的流程
```

## 八、系统与用户接口

### GET /api/dashboard/stats — 仪表盘数据

```
响应 (200):
{
  "stats": {
    "apps": 5,
    "chats": 23,
    "docs": 10,
    "flows": 3
  },
  "activities": [
    {
      "id": "...",
      "type": "chat",          // chat/app/workflow
      "title": "...",
      "description": "...",
      "timestamp": "..."
    }
  ]
}

→ activities 合并自 Chat、App、Workflow 三表
→ 按时间降序排序
→ 取最近 10 条
```

### GET /api/health — 系统健康检查

```
响应 (200):
{
  "database": true,            // SELECT 1 测试
  "api": true,                 // 恒为 true（可达即健康）
  "ollama": true               // checkOllamaStatus()
}

→ 用于仪表盘的系统状态卡片
```

### GET /api/settings/status — 设置页数据

```
响应 (200):
{
  "ollama": {
    "running": true,
    "url": "http://localhost:11434",
    "model": "qwen2.5:7b",
    "models": ["qwen2.5:7b", "llama3:8b"]
  },
  "stats": {
    "apps": 5,
    "chats": 23,
    "docs": 10,
    "workflows": 3,
    "executions": 45
  }
}
```

### GET /api/users — 用户列表

```
→ 获取所有用户（不返回密码）
```

### POST /api/users — 创建用户

```
请求体:
{
  "email": "...",
  "password": "...",
  "name": "..."
}

→ 自动 hashPassword
```

### GET /api/user/stats — 当前用户统计

```
→ 需要已登录
→ 统计当前用户的 apps/chats/docs/workflows 数量

→ 如果未登录，返回全局统计
```

## 九、接口权限总结

| 接口 | 认证要求 | 权限检查 |
|------|----------|----------|
| /api/auth/login | 无需 | — |
| /api/auth/register | 无需 | — |
| /api/auth/logout | 无需 | — |
| /api/auth/me | 需要 Cookie | — |
| /api/apps/* | 需要 | 仅 owner 可编辑/删除 |
| /api/chats/* | 需要 | 通过 App owner 间接验证 |
| /api/chat | 需要 | App owner 验证 |
| /api/documents/* | 需要 | 仅 owner |
| /api/workflows/* | 需要 | 仅 owner |
| /api/embeddings/* | 需要 | — |
| /api/user/stats | 可选 | 未登录返回全局统计 |
| /api/health | 无需 | — |
| /api/dashboard/stats | 无需 | — |
| /api/settings/status | 无需 | — |
