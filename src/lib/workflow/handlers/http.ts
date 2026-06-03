// HTTP 节点: 调用外部 API
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString, resolveVariablesInObject } from "../variable";

interface HTTPConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as HTTPConfig) || {};

    if (!config.url) {
      return { success: false, error: "未配置 URL" };
    }

    // 解析 URL 和请求体中的变量
    const url = resolveVariablesInString(config.url, {
      outputs: context.outputs,
      inputs: context.inputs,
    });

    const headers = config.headers
      ? resolveVariablesInObject(config.headers, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : {};

    let body: string | undefined;
    if (config.body) {
      body = resolveVariablesInString(config.body, {
        outputs: context.outputs,
        inputs: context.inputs,
      });
    }

    const timeout = (config.timeout as number) || 30000;

    // 发起请求
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: config.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: config.method !== "GET" ? body : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let responseData: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: response.ok,
      data: {
        status: response.status,
        statusText: response.statusText,
        body: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      },
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, error: "请求超时" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "HTTP 请求失败",
    };
  }
}
