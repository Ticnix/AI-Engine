import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeWorkflow, type ExecutionEvent } from "@/lib/workflow/engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: 执行工作流 (SSE 流式推送)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    // 验证工作流属于当前用户
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId: userId || undefined },
      select: { id: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: "无权执行" }, { status: 403 });
    }

    const body = await request.json();
    const input = body.input || {};

    const nodes: any[] = body.nodes || [];
    const edges: any[] = body.edges || [];

    const events: ExecutionEvent[] = [];

    const onEvent = async (event: ExecutionEvent) => {
      events.push(event);
    };

    executeWorkflow(id, input, userId || undefined, onEvent, nodes.length > 0 ? { nodes, edges } : undefined).catch((err) => {
      console.error("SSE 执行工作流异常:", err);
      events.push({
        type: "workflow_error",
        error: err instanceof Error ? err.message : "未知错误",
      });
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        let lastIndex = 0;
        let isDone = false;

        const interval = setInterval(() => {
          while (lastIndex < events.length) {
            const event = events[lastIndex];
            const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(message));
            lastIndex++;
          }

          const lastEvent = events[events.length - 1];
          if (lastEvent && (lastEvent.type === "workflow_complete" || lastEvent.type === "workflow_error")) {
            isDone = true;
          }
        }, 200);

        const timeout = setTimeout(() => {
          if (!isDone) {
            controller.enqueue(
              encoder.encode(`event: workflow_error\ndata: {"error":"执行超时"}\n\n`)
            );
          }
          clearInterval(interval);
          controller.close();
        }, 5 * 60 * 1000);

        const checkDone = setInterval(() => {
          if (isDone) {
            clearInterval(checkDone);
            clearInterval(interval);
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            clearTimeout(timeout);
            setTimeout(() => controller.close(), 1000);
          }
        }, 500);
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE 执行工作流失败:", error);
    return NextResponse.json({ error: "执行失败" }, { status: 500 });
  }
}
