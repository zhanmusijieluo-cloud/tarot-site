import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Astrology Birth Chart",
  description: "Enter your birth details to reveal your sun, moon and rising signs with AI interpretation.",
  alternates: { canonical: "https://mustar.vip/astrology" },
};

export default function AstrologyLayout({ children }: { children: ReactNode }) {
  return children;
}
