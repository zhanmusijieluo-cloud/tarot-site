import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Serif_SC, Playfair_Display } from "next/font/google";
import "./globals.css";
import Starfield from "@/components/Starfield";
import ThemeScript from "@/components/ThemeScript";
import BackButton from "@/components/BackButton";
import { I18nProvider } from "@/i18n";

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  weight: ["400", "600", "700"],
});

// 标题字体 Playfair Display，副标题/斜体用 Cormorant Garamond
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mustar.vip"),
  title: {
    default: "Mumu Tarot — Find Your Answer in Stillness",
    template: "%s | Mumu Tarot",
  },
  description:
    "AI-guided immersive digital mysticism space. Free online tarot readings with 33 spreads, astrology charts, Lenormand, BaZi and Zi Wei Dou Shu — in English, Chinese and Japanese.",
  keywords: [
    "tarot reading online",
    "free tarot spreads",
    "AI tarot interpretation",
    "astrology birth chart",
    "lenormand",
    "bazi",
    "zi wei dou shu",
    "塔罗牌在线抽牌",
    "占星星盘",
    "雷诺曼卡",
    "八字排盘",
    "紫微斗数",
  ],
  openGraph: {
    type: "website",
    siteName: "Mumu Tarot",
    url: "https://mustar.vip",
    title: "Mumu Tarot — Find Your Answer in Stillness",
    description:
      "AI-guided immersive digital mysticism space. Tarot, astrology, Lenormand, BaZi & Zi Wei Dou Shu.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mumu Tarot — Find Your Answer in Stillness",
    description:
      "AI-guided immersive digital mysticism space. Tarot, astrology, Lenormand, BaZi & Zi Wei Dou Shu.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080709",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="rose-mist"
      className={`h-full ${notoSerifSC.variable} ${playfair.variable} ${cormorant.variable}`}
    >
      <body className="bg-void font-sans text-frost antialiased overflow-x-hidden">
        <I18nProvider>
          <ThemeScript />
          <Starfield count={180} />
          {/* 全站磨砂噪点覆盖层（film grain） */}
          <div className="grain-overlay" aria-hidden="true" />
          <BackButton />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
