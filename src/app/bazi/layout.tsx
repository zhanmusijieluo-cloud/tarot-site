import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BaZi (Four Pillars)",
  description: "Chinese Four Pillars of Destiny — chart your year, month, day and hour pillars.",
  alternates: { canonical: "https://mustar.vip/bazi" },
};

export default function BaziLayout({ children }: { children: ReactNode }) {
  return children;
}
