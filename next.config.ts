import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 类型检查由独立 tsc 步骤把关（CI 已跑 tsc --noEmit），避免构建时重复检查卡住
  typescript: {
    ignoreBuildErrors: true,
  },
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
  // 实验性：静态导入图片自动优化
  experimental: {
    optimizePackageImports: ["three", "@react-spring/web", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;
