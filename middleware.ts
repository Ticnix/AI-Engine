import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 需要登录才能访问的路径前缀
const protectedPaths = [
  "/flow",
  "/apps",
  "/chats",
  "/knowledge",
  "/settings",
];

// 不需要保护的公开路径
const publicPaths = ["/login", "/api", "/_next", "/favicon"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 公开路径直接放行
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 检查是否受保护路径：显式列出 + 根路径（对应 (main) 路由组）
  const isProtected =
    pathname === "/" ||
    protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  // 检查 auth session cookie
  const session = request.cookies.get("auth_session");
  if (!session?.value) {
    // 未登录，重定向到登录页
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
