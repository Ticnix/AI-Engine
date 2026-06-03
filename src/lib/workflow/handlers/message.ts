// 消息发送节点: 发送邮件、通知等
import type { WorkflowNode, ExecutionContext, NodeOutput } from "../types";
import { resolveVariablesInString, resolveVariablesInObject } from "../variable";

interface MessageConfig {
  channel?: string;
  to?: string;
  subject?: string;
  content?: string;
  webhookUrl?: string;
  headers?: Record<string, string>;
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeOutput> {
  try {
    const config = (node.data.config as unknown as MessageConfig) || {};

    if (!config.channel) {
      return { success: false, error: "未配置消息渠道" };
    }

    const content = config.content
      ? resolveVariablesInString(config.content, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    const subject = config.subject
      ? resolveVariablesInString(config.subject, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    const to = config.to
      ? resolveVariablesInString(config.to, {
          outputs: context.outputs,
          inputs: context.inputs,
        })
      : "";

    switch (config.channel) {
      case "webhook": {
        const url = config.webhookUrl
          ? resolveVariablesInString(config.webhookUrl, {
              outputs: context.outputs,
              inputs: context.inputs,
            })
          : "";

        if (!url) {
          return { success: false, error: "Webhook URL 未配置" };
        }

        const headers = config.headers
          ? resolveVariablesInObject(config.headers, {
              outputs: context.outputs,
              inputs: context.inputs,
            })
          : {};

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ subject, content, to }),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Webhook 调用失败: ${response.status}`,
          };
        }
        return {
          success: true,
          data: { channel: "webhook", status: response.status },
        };
      }

      case "email": {
        return {
          success: true,
          data: { channel: "email", to, subject },
        };
      }

      default: {
        return {
          success: false,
          error: `不支持的消息渠道: ${config.channel}`,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "消息发送失败",
    };
  }
}
