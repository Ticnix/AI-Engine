import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;
const COOKIE_NAME = "auth_session";

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

// 密码验证
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}

// 设置认证 Cookie（在 Route Handler 中使用，返回 NextResponse 实例）
export function createAuthResponse(
  response: NextResponse,
  userId: string,
  rememberMe: boolean = false
): void {
  response.cookies.set(COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    path: "/",
  });
}

// 获取当前用户 ID
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// 获取当前用户
export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return user;
}

// 清除认证 Cookie（在 Route Handler 中使用）
export function clearAuthResponse(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

// 清除认证 Cookie（在 Server Component 中使用）
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}