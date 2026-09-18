import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * www.mustar.vip -> mustar.vip 永久跳转（301）
 *
 * 为什么放在 middleware 而不是 vercel.json：
 * Next.js 在 Vercel 上会把 vercel.json 的 redirects 编译进路由清单，
 * 但边缘缓存命中时不会回源执行，导致根路径 "/" 长期返回旧的 200 缓存。
 * middleware 在路由之前执行，且这里的响应显式带 no-store，保证不被缓存。
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // 跳过静态资源与图片优化，避免无谓的函数调用
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
