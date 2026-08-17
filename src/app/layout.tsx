import type { Metadata } from "next";
import { Cinzel, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "塔罗 · Tarot — 神秘指引",
  description: "在线塔罗占卜，聆听宇宙的低语，洞见命运的轨迹",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${cinzel.variable} ${notoSerifSC.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-[#0d0618] text-[#e8e0f0]">
        {children}
      </body>
    </html>
  );
}
