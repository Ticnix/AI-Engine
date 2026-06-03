import { MainLayout } from "@/components/layout/main-layout";
import { ThemeProvider } from "@/components/theme-provider";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端认证检查：未登录则重定向到登录页
  const cookieStore = await cookies();
  const session = cookieStore.get("auth_session");
  if (!session?.value) {
    redirect("/login");
  }

  return (
    <ThemeProvider>
      <MainLayout>{children}</MainLayout>
    </ThemeProvider>
  );
}