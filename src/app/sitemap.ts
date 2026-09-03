import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mustar.vip";
  const routes: Array<{ path: string; priority: number; freq: "daily" | "weekly" | "monthly" }> = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/online", priority: 0.9, freq: "weekly" },
    { path: "/reading", priority: 0.9, freq: "weekly" },
    { path: "/spreads", priority: 0.8, freq: "weekly" },
    { path: "/daily", priority: 0.8, freq: "daily" },
    { path: "/learn", priority: 0.7, freq: "weekly" },
    { path: "/astrology", priority: 0.7, freq: "weekly" },
    { path: "/lenormand", priority: 0.7, freq: "weekly" },
    { path: "/bazi", priority: 0.7, freq: "weekly" },
    { path: "/ziwei", priority: 0.7, freq: "weekly" },
    { path: "/about", priority: 0.4, freq: "monthly" },
    { path: "/manual", priority: 0.4, freq: "monthly" },
  ];

  return routes.map(({ path, priority, freq }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));
}
