import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { executeWorkflow } from "@/lib/workflow/engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: 执行工作流 (普通执行, 等待完成返回结果)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let userId: string | null = null;
    try {
      userId = await getCurrentUserId();
    } catch {
      // ignore - allow unauthenticated execution
    }
    const body = await request.json();

    const input = body.input || {};

    const result = await executeWorkflow(id, input, userId || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, executionId: result.executionId },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      executionId: result.executionId,
    });
  } catch (error) {
    console.error("执行工作流失败:", error);
    return NextResponse.json({ error: "执行失败" }, { status: 500 });
  }
}
