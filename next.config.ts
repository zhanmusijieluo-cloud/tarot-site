import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 2026-09-15: 移除 typescript.ignoreBuildErrors —— 原注释称"CI 已跑 tsc --noEmit"，
  // 但项目并无 CI，等于构建时完全不校验类型。当前 tsc 0 错误，交给构建把关。
  // 开启 gzip/brotli 压缩（Vercel 边缘默认支持，这里显式声明）
  compress: true,
  // 图片优化：本地 public 图片用 Next 内置优化器（自动转 WebP/AVIF + 响应式尺寸）
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天
    remotePatterns: [],
  },
  // 牌面图：线上实测此前是 max-age=0, must-revalidate，每次回访每张牌都要回源校验一次。
  // 取 1 天 + 7 天 SWR：回访当天零请求，万一换图最多 24 小时后生效（文件名不带 hash，不敢上 immutable）
  async headers() {
    return [
      {
        source: "/cards/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        // 只给 .webp 牌面图，别把 /lenormand/draw 这些页面也罩进长缓存
        source: "/lenormand/:file.webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  // 实验性：静态导入图片自动优化
  experimental: {
    optimizePackageImports: ["three", "@react-spring/web", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;
