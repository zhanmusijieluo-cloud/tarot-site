import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "User Guide",
  description: "How to use Mumu Tarot: drawing cards, choosing spreads and understanding interpretations.",
  alternates: { canonical: "https://mustar.vip/manual" },
};

export default function ManualLayout({ children }: { children: ReactNode }) {
  return children;
}
