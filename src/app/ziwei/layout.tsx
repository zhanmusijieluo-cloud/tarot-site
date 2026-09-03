import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Zi Wei Dou Shu",
  description: "Purple Star Astrology — explore the 14 major stars and your life palaces.",
  alternates: { canonical: "https://mustar.vip/ziwei" },
};

export default function ZiweiLayout({ children }: { children: ReactNode }) {
  return children;
}
