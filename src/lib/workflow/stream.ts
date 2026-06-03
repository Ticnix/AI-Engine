// SSE 流式推送工具
import type { ExecutionEvent } from "./engine";

// 发送 SSE 事件
export function sendSSE(res: Response, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return encoder.encode(message);
}

// SSE 事件格式
export function formatSSE(event: ExecutionEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// 创建可读流
export function createSSEStream(
  onSubscribe: (controller: ReadableStreamDefaultController) => void
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      onSubscribe(controller);
    },
  });
}

// 将执行事件推送到 SSE 流
export function streamExecutionEvents(
  controller: ReadableStreamDefaultController,
  events: ExecutionEvent[]
) {
  for (const event of events) {
    controller.enqueue(new TextEncoder().encode(formatSSE(event)));
  }
}

// 结束 SSE 流
export function closeSSE(controller: ReadableStreamDefaultController) {
  controller.enqueue(new TextEncoder().encode("event: done\ndata: {}\n\n"));
  controller.close();
}
