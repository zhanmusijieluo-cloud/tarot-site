'use client';

// ============================================================
// 经典线条盘 (view=classic) — 极简圈层: 星座环(淡彩四元素+符号) → 宫位环(窄) →
//   角标度数环(行星符号区, 色随落座星座) → 内圆相位弦(四色)
// 最外刻度带已删 (爸爸: 没用); 数据与3D盘同源同角映射
// ============================================================

import { useMemo, useState } from 'react';
import type { VChart } from '@/components/astro/ChartWheel';
import { aspectHex } from '@/lib/astro/aspect-colors';

// 与 ChartWheel.tsx (3D盘) 完全同源的角映射 — 两视图逐位对齐
function lonToAngle(lon: number, ascLon: number, dir: 'ccw' | 'cw' = 'ccw', ascPos: 'left' | 'top' = 'left'): number {
  const rel = (((lon - ascLon) % 360) + 360) % 360;
  const signed = dir === 'cw' ? -rel : rel;
  const base = ascPos === 'top' ? 360 : 180;
  return (base + signed) * Math.PI / 180;
}
const SIGNS_GLYPH = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'];
const ELEMENTS = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];

const SIZE = 920, C = SIZE / 2;
const R_OUT = 392;            // 外边界 (最外刻度带已删, 这就是盘沿)
const R_SIGN_IN = 348;        // 星座环内缘 (带宽52, 原68缩约1/4)
const R_GLYPH = 376;          // 星座符号位
const R_HOUSE_IN = 314;       // 宫位环内缘 (带宽34, 原66减半)
const R_HOUSE_NUM = 331;      // 宫号位
const R_PLANET = 288;         // 行星符号基准圈 (角标度数区, 拥挤整组向内让层)
const R_ASPECT = 252;         // 内圆 = 相位弦边界

const xy = (r: number, a: number) => [C + r * Math.cos(a), C - r * Math.sin(a)] as const;
const wrap = (lon: number) => ((lon % 360) + 360) % 360;
const fmtDeg = (lon: number) => {
  const L = wrap(lon) % 30;
  const d = Math.floor(L);
  const m = Math.floor((L - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
};

export default function ChartWheel2D({ chart, zhMode, selected, onSelect }: {
  chart: VChart; zhMode: boolean; selected: string | null; onSelect: (n: string | null) => void;
}) {
  const [paper, setPaper] = useState(true);
  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  const DIR = chart.settings?.display?.dir ?? 'ccw';
  const ASCP = chart.settings?.display?.ascPos ?? 'left';
  const la = (lon: number) => lonToAngle(lon, ascLon, DIR, ASCP);
  const cusps = chart.cusps as number[] | null;
  const hasHouses = chart.timeKnown && !!cusps && cusps.length >= 12;
  const signIdx = (lon: number) => Math.floor(wrap(lon) / 30);

  // ---- 双主题 + 四元素淡彩 (浅红/浅褐/浅绿=风/浅蓝=水, 爸爸定标) ----
  const P = paper
    ? { bg: '#ffffff', ink: '#0f1626', ring: '#aeb6c2', houseLine: '#9aa4b2', axis: '#39424f', signSel: 'rgba(43,110,217,0.14)', sel: '#a9821f' }
    : { bg: '#0a0f1e', ink: '#dbe4f5', ring: 'rgba(148,163,196,0.45)', houseLine: 'rgba(148,163,196,0.42)', axis: '#c7d2e8', signSel: 'rgba(96,165,250,0.22)', sel: '#ffd75e' };
  const TINT = paper
    ? { fire: '#f9e3df', earth: '#efe6d2', air: '#e3f1e6', water: '#e0e9f6' }
    : { fire: '#3a1f22', earth: '#332b1d', air: '#1e3325', water: '#1c2637' };
  // 符号/行星用同色系但更深一档, 保证在淡彩底上可读
  const SHADE = paper
    ? { fire: '#c8402f', earth: '#8a6d3b', air: '#3f9455', water: '#3775b8' }
    : { fire: '#f08a7d', earth: '#cbb27e', air: '#7fd49a', water: '#7db3ef' };

  // ---- 行星: 基准圈贴着宫环内侧; 拥挤先沿切向滑半步, 再降层 (绝不堆向中心) ----
  const glyphs = useMemo(() => {
    const items = chart.planets.map((p) => ({ p, a: la(p.longitude) })).sort((x, y) => x.a - y.a);
    const out: { p: VChart['planets'][0]; a: number; r: number }[] = [];
    const used: { x: number; y: number }[] = [];
    const GAP = 40;
    const LAYERS = [296, 268, 248];   // 三环带, 全部在宫环与内圆之间
    outer: for (const it of items) {
      for (const r of LAYERS) {
        for (const off of [0, 0.035, -0.035, 0.07, -0.07, 0.105, -0.105]) {
          const a = it.a + off;
          const pos = xy(r, a);
          if (!used.some((u) => Math.hypot(u.x - pos[0], u.y - pos[1]) < GAP)) {
            used.push({ x: pos[0], y: pos[1] });
            out.push({ p: it.p, a, r });
            continue outer;
          }
        }
      }
      const pos = xy(LAYERS[2], it.a); used.push({ x: pos[0], y: pos[1] });
      out.push({ p: it.p, a: it.a, r: LAYERS[2] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  const aspList = chart.aspects;
  const rel = (a: { a: string; b: string }) => !selected || a.a === selected || a.b === selected;

  // 扇区环带 path (r外/r内, 角度a0→a1, 顺盘向30°)
  const sector = (rOut: number, rIn: number, a0: number, a1: number) => {
    const [p1x, p1y] = xy(rOut, a0), [p2x, p2y] = xy(rOut, a1);
    const [p3x, p3y] = xy(rIn, a1), [p4x, p4y] = xy(rIn, a0);
    const fArc = DIR === 'cw' ? 1 : 0;
    return `M ${p1x} ${p1y} A ${rOut} ${rOut} 0 0 ${fArc} ${p2x} ${p2y} L ${p3x} ${p3y} A ${rIn} ${rIn} 0 0 ${1 - fArc} ${p4x} ${p4y} Z`;
  };
  const selSign = selected ? signIdx(chart.planets.find((x) => x.name === selected)?.longitude ?? 0) : -1;

  return (
    <div className="relative h-full w-full">
      <button
        onClick={() => setPaper((v) => !v)}
        className="absolute right-2 top-2 z-10 rounded-full border px-2.5 py-1 text-[11px]"
        style={{ borderColor: P.ring, color: P.ink, background: P.bg }}
      >
        {paper ? (zhMode ? '墨黑' : 'Dark') : (zhMode ? '纸白' : 'Paper')}
      </button>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full select-none" onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
      {/* 盘沿 (无刻度带) */}
      <circle cx={C} cy={C} r={R_OUT} fill={P.bg} stroke={P.ring} strokeWidth="1.2" onClick={() => onSelect(null)} />
      <circle cx={C} cy={C} r={R_ASPECT} fill="none" stroke={P.ring} strokeWidth="1" />
      {/* 星座环淡彩底 (每座一扇区, 相邻即界限; 选中座加深一档) */}
      {Array.from({ length: 12 }, (_, si) => {
        return <path key={si} d={sector(R_OUT, R_SIGN_IN, la(si * 30), la(si * 30 + 30))} fill={TINT[ELEMENTS[si] as 'fire']} opacity={si === selSign ? 1 : 0.85} stroke="none" />;
      })}
      {/* 选中星座高亮环带 */}
      {selSign >= 0 && <path d={sector(R_OUT, R_SIGN_IN, la(selSign * 30), la(selSign * 30 + 30))} fill={P.signSel} stroke="none" />}
      {/* 环分界: 星座/宫位 两道浅灰圆 */}
      <circle cx={C} cy={C} r={R_SIGN_IN} fill="none" stroke={P.ring} strokeWidth="1" />
      <circle cx={C} cy={C} r={R_HOUSE_IN} fill="none" stroke={P.ring} strokeWidth="1" />
      {/* 星座边界线(跨星座+宫两带) + 符号 + 起度小字 */}
      {Array.from({ length: 12 }, (_, si) => {
        const ab = la(si * 30);
        const [bx1, by1] = xy(R_SIGN_IN, ab), [bx2, by2] = xy(R_OUT, ab);
        const [mx, my] = xy(R_GLYPH, la(si * 30 + 15));
        return (
          <g key={si}>
            <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={P.ring} strokeWidth="1" />
            <text x={mx} y={my + 9} textAnchor="middle" fontSize="26" fill={SHADE[ELEMENTS[si] as 'fire']}>{SIGNS_GLYPH[si]}</text>
          </g>
        );
      })}
      {/* 宫头线: 仅宫位带窄段 (四轴另有贯穿径线) */}
      {hasHouses && cusps!.map((c0, h) => {
        if (h % 3 === 0) return null;
        const a0 = la(c0);
        const [x1, y1] = xy(R_HOUSE_IN, a0), [x2, y2] = xy(R_SIGN_IN, a0);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={P.houseLine} strokeWidth="1" />;
      })}
      {/* 宫位环: 仅宫号 (宫头=星座边界线已贯穿; 四轴单独加深) */}
      {hasHouses && cusps!.map((c0, h) => {
        const c1 = cusps![(h + 1) % 12];
        let span = wrap(c1 - c0); if (span < 1) span = 30;
        const [nx, ny] = xy(R_HOUSE_NUM, la(c0 + span / 2));
        return <text key={h} x={nx} y={ny + 5} textAnchor="middle" fontSize="13" fill={P.ink} fontWeight={h % 3 === 0 ? 700 : 400}>{h + 1}</text>;
      })}
      {/* 四轴贯穿直径 (加深) */}
      {hasHouses && [cusps![0], cusps![9]].map((lon, i) => {
        const a = la(lon);
        const [x1, y1] = xy(R_OUT - 1, a);
        return <line key={i} x1={x1} y1={y1} x2={SIZE - x1} y2={SIZE - y1} stroke={P.axis} strokeWidth={i === 0 ? 1.6 : 1.2} />;
      })}
      {/* 角标 (盘沿外, 贴自身轴线, 带轴点度分) */}
      {hasHouses && [cusps![0], cusps![3], cusps![6], cusps![9]].map((lon, i) => {
        const lab = ['ASC', 'IC', 'DSC', 'MC'][i];
        const a = la(lon);
        const [bx, by] = xy(R_OUT + 15, a);
        const [dx, dy] = xy(R_OUT + 29, a);
        return (
          <g key={i}>
            <text x={bx} y={by + 4.5} textAnchor="middle" fontSize="13.5" fontWeight={700} fill={paper ? '#c25d84' : '#d9a8b8'}>{lab}</text>
            <text x={dx} y={dy + 4} textAnchor="middle" fontSize="9.5" fill={P.ink} opacity="0.8">{fmtDeg(lon)}</text>
          </g>
        );
      })}
      {/* 相位弦线: 端点=真实度数落在内圆边界, 四色细线 */}
      {aspList.map((a, i) => {
        const ga = glyphs.find((g) => g.p.name === a.a), gb = glyphs.find((g) => g.p.name === a.b);
        if (!ga || !gb) return null;
        const [x1, y1] = xy(R_ASPECT, ga.a), [x2, y2] = xy(R_ASPECT, gb.a);
        const hot = rel(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={aspectHex(a.type)} strokeWidth={selected && hot ? 1.8 : 1} opacity={selected ? (hot ? 0.95 : 0.08) : 0.55} style={{ transition: 'opacity 0.25s' }} />;
      })}
      {/* 行星符号: 位于宫环之外的角标度数圈, 颜色=落座星座同色系; 选中=金环+引针 */}
      {glyphs.map(({ p, a, r }) => {
        const [gx, gy] = xy(r, a);
        const [tx, ty] = xy(r + 17, a);            // 度分 = 符号径向外侧, 永不入内圆
        const col = SHADE[ELEMENTS[signIdx(p.longitude)] as 'fire'];
        const isSel = selected === p.name;
        const relatedSel = selected && chart.aspects.some((x) => (x.a === p.name || x.b === p.name) && (x.a === selected || x.b === selected));
        const dim = selected && !isSel && !relatedSel;
        const [lx1, ly1] = xy(R_ASPECT, a), [lx2, ly2] = xy(r - 11, a);
        return (
          <g key={p.name} onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : p.name); }} style={{ cursor: 'pointer', opacity: dim ? 0.55 : 1, transition: 'opacity 0.25s' }}>
            {isSel && <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={P.sel} strokeWidth="1" opacity="0.75" />}
            {isSel && <circle cx={gx} cy={gy} r="13.5" fill="none" stroke={P.sel} strokeWidth="1.4" />}
            <text x={gx} y={gy + 6.5} textAnchor="middle" fontSize="18" fontWeight={600} fill={col} stroke={P.bg} strokeWidth="2.6" paintOrder="stroke">{p.symbol}{p.retrograde ? '℞' : ''}</text>
            <text x={tx} y={ty + 3.5} textAnchor="middle" fontSize="10" fill={P.ink} stroke={P.bg} strokeWidth="2" paintOrder="stroke">{fmtDeg(p.longitude)}</text>
          </g>
        );
      })}
      </svg>
    </div>
  );
}
