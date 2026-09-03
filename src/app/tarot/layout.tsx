import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tarot Card Encyclopedia",
  description: "Explore all 78 Rider-Waite-Smith cards with upright and reversed meanings.",
  alternates: { canonical: "https://mustar.vip/tarot" },
};

export default function TarotLayout({ children }: { children: ReactNode }) {
  return children;
}
