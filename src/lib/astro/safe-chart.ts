'use client';

// ============================================================
// 盘数据兜底归一化
//
// 背景 (2026-09-18):
//   星盘页出现过"排盘/点星体/切盘种时偶发整页崩溃"。排查发现全站没有错误边界,
//   而绘图组件里有大量 `[...chart.aspects]` / `chart.receptions.filter(...)`
//   / `chart.warnings.length` 这类"假定字段一定存在"的直接访问。
//   只要 API 因为任何原因 (旧版本响应被 CDN/浏览器缓存、某个盘种少算一段、
//   请求被截断后解析出的残缺 JSON) 少给一个数组字段, 渲染期就是一句
//   "Cannot read properties of undefined (reading 'filter')" → 整棵树被卸载 → 白屏。
//
//   这里把"字段缺失"从"崩溃"降级成"空数组", 让盘还能画出来 (顶多少显示一块)。
//   注意: 这不是掩盖 BUG, 只是保证一个缺失字段不至于让用户整页打不开。
// ============================================================

import type { VChart } from '@/components/astro/ChartWheel';

const asArr = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);

/** 盘数据彻底不可用时的空盘 (正常流程走不到; 只是保证渲染不抛错) */
export const EMPTY_CHART: VChart = {
  houseSystemUsed: 'placidus',
  timeKnown: false,
  input: { year: 2000, month: 1, day: 1, hour: 12, minute: 0 },
  planets: [],
  angles: { ascendant: null, midheaven: null },
  cusps: null,
  aspects: [],
  receptions: [],
  warnings: [],
  settings: {},
  extraPoints: {},
};

/** 判断一份盘数据是否已经"字段完整", 完整则原样返回 (保住引用相等, 不白白打断 useMemo) */
function isComplete(c: VChart): boolean {
  return (
    Array.isArray(c.planets) &&
    Array.isArray(c.aspects) &&
    Array.isArray(c.receptions) &&
    Array.isArray(c.warnings) &&
    !!c.angles &&
    !!c.input
  );
}

/**
 * 把可能残缺的盘数据补齐成可安全渲染的形状。
 * 完整数据会原样返回同一个对象引用; 只有残缺时才克隆补齐。
 */
export function safeChart(c: VChart | null | undefined): VChart | null {
  if (!c || typeof c !== 'object') return null;
  if (isComplete(c)) return c;

  return {
    ...c,
    planets: asArr(c.planets),
    angles: {
      ascendant: c.angles?.ascendant ?? null,
      midheaven: c.angles?.midheaven ?? null,
    },
    aspects: asArr(c.aspects),
    receptions: asArr(c.receptions),
    warnings: asArr(c.warnings),
    cusps: Array.isArray(c.cusps) ? c.cusps : null,
    input: c.input ?? { year: 2000, month: 1, day: 1, hour: 12, minute: 0 },
    settings: c.settings ?? {},
    extraPoints: c.extraPoints ?? {},
    houseSystemUsed: c.houseSystemUsed ?? 'placidus',
    timeKnown: !!c.timeKnown,
  };
}
