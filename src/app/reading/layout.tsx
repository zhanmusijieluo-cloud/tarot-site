import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tarot Reading Library",
  description: "Browse and revisit your past tarot readings, each with full AI interpretation and spread details.",
  alternates: { canonical: "https://mustar.vip/reading" },
};

export default function ReadingLayout({ children }: { children: ReactNode }) {
  return children;
}
