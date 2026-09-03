import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Online Tarot Reading",
  description: "Draw cards in an immersive 3D scene and get AI-guided interpretations. Choose from 33 spreads or build your own.",
  alternates: { canonical: "https://mustar.vip/online" },
};

export default function OnlineLayout({ children }: { children: ReactNode }) {
  return children;
}
