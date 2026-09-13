'use client';

// ============================================================
// 经典线条盘 (view=classic) — Astro.com 式专业盘, SVG 矢量渲染
// 数据与3D盘完全同源: 同一 chart / lonToAngle 角映射 / 相位四色表 / 点击联动
// 结构: 外圈刻度+星座符号环 → 宫位环(不等分宫头+宫号) → 内圆相位网+行星符号(拥挤移位带引线)
// ============================================================

import { useMemo } from 'react';
import type { VChart } from '@/components/astro/ChartWheel';
import { aspectHex } from '@/lib/astro/aspect-colors';

// 与 ChartWheel.tsx (3D盘) 完全同源的角映射 — 两视图逐位对齐
function lonToAngle(lon: number, ascLon: number, dir: 'ccw' | 'cw' = 'ccw', ascPos: 'left' | 'top' = 'left'): number {
  const rel = (((lon - ascLon) % 360) + 360) % 360;
  const signed = dir === 'cw' ? -rel : rel;
  const base = ascPos === 'top' ? 360 : 180;
  return (base + signed) * Math.PI / 180;
}
const SIGNS_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const SIZE = 880, C = SIZE / 2;
const R_TICK_OUT = 388, R_TICK_IN = 372;        // 刻度带
const R_SIGN_OUT = 372, R_SIGN_IN = 322;        // 星座环
const R_HOUSE_OUT = 322, R_HOUSE_IN = 252;      // 宫位环 (Astro.com 把宫头线画到内圆, 我们同样贯穿: 宫环+内区都可见)
const R_PLAN_MIN = 140, R_PLAN_MAX = 240;       // 行星符号圈层区
const R_GLYPH = 20;                              // 符号半宽(避让判定)

// 极坐标 → 屏幕坐标 (数学角: 0=右, 逆时针正; ASC在左=180°)
const xy = (r: number, a: number) => [C + r * Math.cos(a), C - r * Math.sin(a)] as const;

export default function ChartWheel2D({ chart, selected, onSelect }: {
  chart: VChart; zhMode: boolean; selected: string | null; onSelect: (n: string | null) => void;
}) {
  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  const DIR = chart.settings?.display?.dir ?? 'ccw';
  const ASCP = chart.settings?.display?.ascPos ?? 'left';
  const la = (lon: number) => lonToAngle(lon, ascLon, DIR, ASCP);
  const cusps = chart.cusps as number[] | null;
  const hasHouses = chart.timeKnown && !!cusps && cusps.length >= 12;

  // ---- 行星: 真实角 + 拥挤移位 (经典盘做法: 符号挪窝, 刻度位置不变) ----
  const glyphs = useMemo(() => {
    const TAU = Math.PI * 2
    const items = chart.planets.map((p) => ({ p, a: la(p.longitude) }))
    const out: { p: VChart['planets'][0]; realA: number; drawA: number; r: number }[] = []
    const placed: { a: number; r: number }[] = []
    const ANG = 0.125            // 同圈最小角距 (~7°)
    const RINGS = [R_PLAN_MAX, R_PLAN_MAX - 34, R_PLAN_MIN + 50, R_PLAN_MIN]
    const angGap = (a: number, b: number) => Math.abs(((a - b) % TAU + TAU * 1.5) % TAU - Math.PI)
    // 先排紧密相位的星(按真实角排序), 越挤越往内圈让
    const sorted = [...items].sort((x, y) => x.a - y.a)
    for (const it of sorted) {
      let best: { a: number; r: number } | null = null
      outer: for (const r of RINGS) {
        for (let off = 0; off <= 16; off++) {
          for (const sgn of off === 0 ? [0] : [1, -1]) {
            const a = it.a + sgn * off * 0.03
            if (placed.every((q) => Math.abs(q.r - r) >= 24 || angGap(q.a, a) > ANG)) {
              best = { a, r }
              break outer
            }
          }
        }
      }
      const use = best ?? { a: it.a, r: RINGS[0] }
      placed.push(use)
      out.push({ p: it.p, realA: it.a, drawA: use.a, r: use.r })
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  const aspList = chart.aspects;
  const related = (name: string | null) => (a: { a: string; b: string }) => !name || a.a === name || a.b === name;
  const rel = related(selected);

  // 相位线端点: 宫环内缘内侧边界上的真实度数弦 (Astro.com 同款: 弦网铺满内圆)
  const R_END = R_HOUSE_IN - 4;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full select-none" onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
      {/* 盘面底 */}
      <circle cx={C} cy={C} r={R_TICK_OUT} fill="rgba(8,11,22,0.55)" stroke="rgba(205,184,138,0.5)" strokeWidth="1.4" />
      {/* 刻度: 5°短针, 10°中, 30°长+外缘分格 */}
      {Array.from({ length: 72 }, (_, k) => k * 5).map((lon) => {
        const maj = lon % 30 === 0, med = lon % 10 === 0
        const a = la(lon)
        const [x1, y1] = xy(R_TICK_IN, a)
        const [x2, y2] = xy(maj ? R_TICK_OUT : med ? R_TICK_OUT - 5 : R_TICK_OUT - 10, a)
        return <line key={lon} x1={x1} y1={y1} x2={x2} y2={y2} stroke={maj ? '#cdb88a' : 'rgba(154,168,196,0.45)'} strokeWidth={maj ? 1.2 : 0.7} />;
      })}
      {/* 环分界圆 */}
      {[R_TICK_IN, R_SIGN_IN, R_HOUSE_IN].map((r, i) => <circle key={i} cx={C} cy={C} r={r} fill="none" stroke={`rgba(205,184,138,${i === 1 ? 0.55 : 0.28})`} strokeWidth={i === 1 ? 1.3 : 0.8} />)}
      {/* 星座环: 30°扇区 + 符号 + 边界 */}
      {Array.from({ length: 12 }, (_, s) => {
        const a0 = la(s * 30), a1 = la(s * 30 + 30)
        const el = ['火', '土', '风', '水'][s % 4]
        const tone = { '火': 'rgba(232,160,138,0.30)', '土': 'rgba(205,184,138,0.30)', '风': 'rgba(156,195,216,0.30)', '水': 'rgba(138,168,216,0.30)' }[el]!
        const [mx, my] = xy((R_SIGN_OUT + R_SIGN_IN) / 2, la(s * 30 + 15))
        const [bx1, by1] = xy(R_SIGN_IN, a0), [bx2, by2] = xy(R_TICK_IN, a0)
        const [p1x, p1y] = xy(R_SIGN_OUT, a0), [p2x, p2y] = xy(R_SIGN_OUT, a1)
        const [p3x, p3y] = xy(R_SIGN_IN, a1), [p4x, p4y] = xy(R_SIGN_IN, a0)
        return (
          <g key={s}>
            <path d={`M ${p1x} ${p1y} A ${R_SIGN_OUT} ${R_SIGN_OUT} 0 0 0 ${p2x} ${p2y} L ${p3x} ${p3y} A ${R_SIGN_IN} ${R_SIGN_IN} 0 0 1 ${p4x} ${p4y} Z`} fill={tone} stroke="none" />
            <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke="rgba(205,184,138,0.4)" strokeWidth="0.9" />
            <text x={mx} y={my + 8} textAnchor="middle" fontSize="30" fill="#eef3ff">{SIGNS_GLYPH[s]}</text>
          </g>
        );
      })}
      {/* 宫位环: 宫头线(贯穿内区到星座环内缘) + 宫号 */}
      {hasHouses && cusps!.map((c0, h) => {
        const c1 = cusps![(h + 1) % 12]
        let span = ((c1 - c0) % 360 + 360) % 360; if (span < 1) span = 30
        const a0 = la(c0), isAcs = h % 3 === 0
        const [x1, y1] = xy(10, a0), [x2, y2] = xy(R_SIGN_IN, a0)
        const [nx, ny] = xy((R_HOUSE_OUT + R_HOUSE_IN) / 2, la(c0 + span / 2))
        return (
          <g key={h}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isAcs ? '#cdb88a' : 'rgba(205,184,138,0.5)'} strokeWidth={isAcs ? 2.2 : 0.9} opacity={isAcs ? 1 : 0.55} />
            <text x={nx} y={ny + 5} textAnchor="middle" fontSize="15" fill={isAcs ? '#f5e9c0' : '#d9e3f6'} opacity="0.95" fontWeight={isAcs ? 700 : 400}>{h + 1}</text>
          </g>
        );
      })}
      {/* 四轴外标签 */}
      {hasHouses && [[cusps![0], 'ASC'], [cusps![6], 'DSC'], [cusps![9], 'MC'], [cusps![3], 'IC']].map(([lon, lab], i) => {
        const a = la(lon as number)
        const [x, y] = xy(R_TICK_OUT + 18, a)
        return <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize="15" fontWeight={700} fill={lab === 'ASC' || lab === 'DSC' ? '#d9a8b8' : '#d9a8b8'} opacity={0.95}>{lab}</text>;
      })}
      {/* 四轴贯穿金线 (ASC-DSC / MC-IC; 过圆心的直径) */}
      {hasHouses && [cusps![0], cusps![9]].map((lon, i) => {
        const a = la(lon)
        const [x1, y1] = xy(R_SIGN_IN, a)
        return <line key={i} x1={x1} y1={y1} x2={SIZE - x1} y2={SIZE - y1} stroke="#cdb88a" strokeWidth={i === 0 ? 2 : 1.6} opacity="0.85" />;
      })}
      {/* 相位线 (四色, 端点=真实度数位置) */}
      {aspList.map((a, i) => {
        const ga = glyphs.find((g) => g.p.name === a.a), gb = glyphs.find((g) => g.p.name === a.b)
        if (!ga || !gb) return null
        const [x1, y1] = xy(R_END, ga.realA), [x2, y2] = xy(R_END, gb.realA)
        const hot = rel(a)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={aspectHex(a.type)} strokeWidth={1.6} opacity={selected ? (hot ? 0.95 : 0.16) : 0.72} style={{ transition: 'opacity 0.25s' }} />;
      })}
      {/* 内圆真度数刻度: 每颗星真实位置上的短刻线 (专业盘标准件, 符号移位后仍可核对) */}
      {glyphs.map(({ p, realA }) => {
        const [x1, y1] = xy(R_HOUSE_IN - 1, realA), [x2, y2] = xy(R_END + 4, realA)
        return <line key={p.name} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(205,184,138,0.8)" strokeWidth="1.2" />;
      })}
      {/* 行星符号: 移位者带短引线到真实刻度位 */}
      {glyphs.map(({ p, realA, drawA, r }) => {
        const [gx, gy] = xy(r, drawA)
        const moved = Math.abs(((realA - drawA) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 0.012
        const [rx2, ry2] = xy(R_END + 4, realA)
        const isSel = selected === p.name
        const dim = selected && !isSel && !chart.aspects.some((a) => (a.a === p.name || a.b === p.name) && (a.a === selected || a.b === selected))
        return (
          <g key={p.name} onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : p.name); }} style={{ cursor: 'pointer', opacity: dim ? 0.62 : 1, transition: 'opacity 0.25s' }}>
            {moved && <line x1={gx} y1={gy} x2={rx2} y2={ry2} stroke="rgba(205,184,138,0.5)" strokeWidth="0.8" />}
            {moved && <circle cx={rx2} cy={ry2} r={2.4} fill="#cdb88a" />}
            {isSel && <circle cx={gx} cy={gy} r={17} fill="none" stroke="#cdb88a" strokeWidth="1.4" opacity="0.8" />}
            <text x={gx} y={gy + (isSel ? 7 : 6.5)} textAnchor="middle" fontSize={isSel ? 26 : 22} fill={isSel ? '#fff3d6' : '#e8eefc'} fontWeight={isSel ? 700 : 400} stroke={isSel ? 'rgba(205,184,138,0.6)' : 'none'} strokeWidth={isSel ? 0.8 : 0}>
              {p.symbol}{p.retrograde ? '℞' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
