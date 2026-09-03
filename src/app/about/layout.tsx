import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Mumu Tarot",
  description: "About the Mumu Tarot digital mysticism space — our vision and the team behind it.",
  alternates: { canonical: "https://mustar.vip/about" },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
