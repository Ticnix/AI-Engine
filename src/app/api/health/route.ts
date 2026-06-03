import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOllamaStatus } from "@/lib/ollama";

export async function GET() {
  const result = {
    database: { status: "error" as "error" | "ok", message: "" },
    api: { status: "ok" as "error" | "ok", message: "API 服务运行中" },
    ollama: { status: "error" as "error" | "ok", message: "" },
  };

  // 1. 检测数据库连接
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = { status: "ok", message: "连接正常" };
  } catch {
    result.database = { status: "error", message: "数据库连接失败" };
  }

  // 2. API 服务始终为 ok（能执行到此说明 API 正常）

  // 3. 检测 Ollama 服务
  try {
    const ollama = await checkOllamaStatus();
    result.ollama = {
      status: ollama.running ? "ok" : "error",
      message: ollama.running
        ? `${ollama.models.length} 个模型可用`
        : "服务未启动",
    };
  } catch {
    result.ollama = { status: "error", message: "服务未启动" };
  }

  // 如果数据库不通，API 服务也算异常
  if (result.database.status === "error") {
    result.api = { status: "error", message: "数据库连接失败" };
  }

  return NextResponse.json(result);
}
