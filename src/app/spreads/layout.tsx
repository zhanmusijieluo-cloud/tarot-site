import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tarot Spreads Collection",
  description: "33 curated tarot spreads across love, career, self-growth and more — with layouts and card meanings.",
  alternates: { canonical: "https://mustar.vip/spreads" },
};

export default function SpreadsLayout({ children }: { children: ReactNode }) {
  return children;
}
