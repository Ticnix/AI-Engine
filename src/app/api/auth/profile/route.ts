import { NextResponse } from "next/server";
import { hashPassword, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();

    // 密码修改优先处理
    if (body.oldPassword && body.newPassword) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });
      if (!dbUser) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 });
      }

      const valid = await bcrypt.compare(body.oldPassword, dbUser.password);
      if (!valid) {
        return NextResponse.json({ error: "旧密码错误" }, { status: 400 });
      }

      const newPasswordHash = await hashPassword(body.newPassword);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { password: newPasswordHash },
        select: { id: true, email: true, name: true, createdAt: true },
      });
      return NextResponse.json(updated);
    }

    // 基本信息更新
    const updates: Record<string, string | null> = {};
    if (body.name !== undefined) updates.name = body.name || null;
    if (body.email !== undefined) updates.email = body.email;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "无有效字段更新" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updates,
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新用户资料失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
