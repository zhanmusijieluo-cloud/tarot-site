import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Learn Tarot",
  description: "Beginner-friendly lessons on tarot basics, card meanings and reading techniques.",
  alternates: { canonical: "https://mustar.vip/learn" },
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children;
}
