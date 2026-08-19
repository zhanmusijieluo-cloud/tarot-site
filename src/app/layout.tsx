import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import Starfield from "@/components/Starfield";
import ThemeScript from "@/components/ThemeScript";

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oracle — 在静默中遇见答案",
  description: "AI 引导的沉浸式数字神秘仪式空间",
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-theme="astral-void"
      className={`h-full ${notoSerifSC.variable}`}
    >
      <body className="min-h-full bg-void font-sans text-frost antialiased overflow-x-hidden">
        <ThemeScript />
        <Starfield count={380} />
        {children}
      </body>
    </html>
  );
}
