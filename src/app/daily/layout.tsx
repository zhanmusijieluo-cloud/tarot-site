import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Daily Tarot & Horoscope",
  description: "Your daily card and zodiac horoscope — a moment of stillness every day.",
  alternates: { canonical: "https://mustar.vip/daily" },
};

export default function DailyLayout({ children }: { children: ReactNode }) {
  return children;
}
