import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lenormand Cards",
  description: "The 36-card Lenormand deck with keywords and reading guidance for everyday questions.",
  alternates: { canonical: "https://mustar.vip/lenormand" },
};

export default function LenormandLayout({ children }: { children: ReactNode }) {
  return children;
}
