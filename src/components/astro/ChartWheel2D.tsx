'use client';

// ============================================================
// 经典线条盘 (view=classic) — 极简圈层: 星座环(淡彩四元素+符号) → 宫位环(窄) →
//   行星圈(全部严格同一半径) → 内圆相位弦(四色)
// 度分 = 符号朝心侧竖排两行(17°/03′), 腾出横向空间, 相近度数在圈上贴紧不摊远
// 最外刻度带已删 (爸爸: 没用); 数据与3D盘同源同角映射
// ============================================================

import { useMemo, useState } from 'react';
import type { VChart, VPlanet } from '@/components/astro/ChartWheel';
import { aspectHex } from '@/lib/astro/aspect-colors';
import { GLYPH_PATHS, SYMBOL_TO_GLYPH, ZODIAC_GLYPH_NAMES } from '@/lib/astro/glyph-paths';
import { firdariaTable, firdaria, SIGN_RULER } from '@/lib/astro/timing';


// 矢量符号渲染: 统一描边粗细 + 双层(白色防粘底+彩色笔画) (爸爸: 像宫神星那样, 系统字体的Unicode符号天然粗细不一)
const GLYPH_SIZE = 24;   // 目标视觉高度 (px) — 爸爸: 再稍微缩小一点点 (26→24)
const GLYPH_STROKE = 1.5; // 统一笔画宽度 — 所有符号同一支"笔"
function GlyphPath({ name, cx, cy, color, bg, size = GLYPH_SIZE }: { name: string; cx: number; cy: number; color: string; bg?: string; size?: number }) {
  const g = GLYPH_PATHS[name];
  if (!g) return null;
  const s = size / Math.max(g.w, g.h);
  const t = `translate(${cx},${cy}) scale(${s}) translate(${-g.cx},${-g.cy})`;
  const paths = g.ds.map((d, i) => <path key={i} d={d} />);
  return (
    <g>
      {bg && <g transform={t} fill="none" stroke={bg} strokeWidth={4.2 / s} strokeLinecap="round" strokeLinejoin="round">{paths}</g>}
      <g transform={t} fill="none" stroke={color} strokeWidth={GLYPH_STROKE / s} strokeLinecap="round" strokeLinejoin="round">{paths}</g>
    </g>
  );
}

// 与 ChartWheel.tsx (3D盘) 完全同源的角映射 — 两视图逐位对齐
function lonToAngle(lon: number, ascLon: number, dir: 'ccw' | 'cw' = 'ccw', ascPos: 'left' | 'top' = 'left'): number {
  const rel = (((lon - ascLon) % 360) + 360) % 360;
  const signed = dir === 'cw' ? -rel : rel;
  const base = ascPos === 'top' ? 360 : 180;
  return (base + signed) * Math.PI / 180;
}
const ELEMENTS = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];

const SIZE = 920, C = SIZE / 2;
// —— 盘体半径 (普通盘全尺寸; 法达/小限盘整盘乘 diskS 缩小, 给外圈大运环/小运环腾位置 — 爸爸: 整体外径与其他盘相同) ——
const R_OUT = 392;             // 盘沿 (最外刻度带已删, 这就是盘沿)
const R_SIGN_IN = 348;         // 星座环内缘
const R_GLYPH = 376;           // 星座符号位
const R_HOUSE_IN = 314;        // 宫位环内缘
const R_HOUSE_NUM = 331;       // 宫号位
const R_PLANET = 284;          // 行星圈: 所有符号严格同一半径 (爸爸铁令)
const R_DUAL_IN = 256;         // 双环: 内圈(本命) — 本命+次限对比 (爸爸: 双击/按钮切双环)
const R_DUAL_OUT = 300;        // 双环: 外圈(次限)
const R_ASPECT = 228;          // 内圆 = 相位弦边界
// —— 外圈双环带 (绝对半径, 不随盘体缩放): 从外到里 小运环→大运环→星座→宫位 (爸爸定稿) ——
const R_SUB_OUT = 384;         // 小运环 (法达子段/小限) 外缘
const R_SUB_IN = 352;          // 小运环内缘
const R_MAIN_OUT = 348;        // 大运环外缘 (主星符号+年龄段, 环内旋转弧排)
const R_MAIN_IN = 316;         // 大运环内缘 (盘体缩到 0.80 刚好贴住, 无缝隙黑圈 — 爸爸: 中间黑环不好看)
const xy = (r: number, a: number) => [C + r * Math.cos(a), C - r * Math.sin(a)] as const;
const wrap = (lon: number) => ((lon % 360) + 360) % 360;
const fmtDeg = (lon: number) => {
  const L = wrap(lon) % 30;
  const d = Math.floor(L);
  const m = Math.floor((L - d) * 60);
  return [`${d}°`, `${String(m).padStart(2, '0')}′`];
};

// ---- 行星排布: 环形松弛 (相近度数沿圈贴紧微开, 绝不摊大饼) — 单环/双环共用, 环半径入参 ----
function layoutRing(planets: VPlanet[], R: number, la: (lon: number) => number) {
  const TAU = Math.PI * 2;
  const n = planets.length;
  const arr = planets.map((p) => ({ p, realA: la(p.longitude), a: la(p.longitude) }));
  if (n > 1) {
    const MIN_G = 50 / R;   // 弦距50px: 逐符号调校后最大⚸28px+℞~40px宽, 留10px余量
    for (let iter = 0; iter < 400; iter++) {
      arr.forEach((it) => { it.a = ((it.a % TAU) + TAU) % TAU; });   // ±π归一化防排序错邻 (koch盘实测bug)
      arr.sort((x, y) => x.a - y.a);
      let moved = false;
      for (let k = 0; k < n; k++) {
        const j = (k + 1) % n;
        const d = j === 0 ? arr[0].a + TAU - arr[n - 1].a : arr[j].a - arr[k].a;
        if (d < MIN_G) { const push = (MIN_G - d) / 2; arr[k].a -= push; arr[j].a += push; moved = true; }
      }
      if (!moved) break;
    }
    arr.sort((x, y) => x.realA - y.realA);
  }
  return arr.map((it) => ({ p: it.p, a: it.a, realA: it.realA }));
}

export default function ChartWheel2D({ chart, zhMode, selected, onSelect, dualRing, outerBand, extraPoints, onBandDate }: {
  chart: VChart; zhMode: boolean; selected: string | null; onSelect: (n: string | null) => void;
  /** 双环 (次限盘专属): 内=本命行星@256, 外=次限行星@300; 不传=单环现状 */
  dualRing?: { inner: VPlanet[]; outer: VPlanet[] } | null;
  /** 外圈信息带 (爸爸: 法达盘/小限盘 = 盘外圈挂环) */
  outerBand?: 'firdaria' | 'profection' | null;
  /** 本命点黄经表 (推运/行运盘: cross 相位线的本命端; 原名字优先于盘上符号) */
  extraPoints?: Record<string, number> | null;
  /** 外环分段点击 → 跳转排盘到该段起始日 (爱星盘同款交互) */
  onBandDate?: (year: number, month: number, day: number) => void;
}) {
  const [paper, setPaper] = useState(true);
  const [bandHover, setBandHover] = useState<number | null>(null);   // 小运环段悬停
  const [mainHover, setMainHover] = useState<number | null>(null);    // 大运环段悬停
  const [bandPin, setBandPin] = useState<{ kind: 'sub' | 'main'; idx: number } | null>(null); // 点击钉住的弹窗 (爸爸: 点击只弹窗不跳转, 防误触)
  // ---- 法达数据 (SVG 环 + 悬停信息面板同源) ----
  const firDay = outerBand === 'firdaria'
    ? !!chart.planets.find((x) => x.name === 'Sun')?.house && (chart.planets.find((x) => x.name === 'Sun')!.house! >= 7)
    : false;
  const firRows = outerBand === 'firdaria' ? firdariaTable(firDay, chart.input.year, chart.input.month, chart.input.day, 1) : null;

  // 大运主段 (内圈大运环用): 9段含起止年龄
  const firPeriods = outerBand === 'firdaria' ? firdaria(firDay) : null;
  const ascLon = chart.angles.ascendant?.longitude ?? 0;
  // 法达/小限盘: 内盘整体缩小 16% 给外圈大运/小运环腾位, 整盘最大外径仍与普通盘一致 (爸爸: 整体大小相同, 加了环所以原环缩小)
  const bandOn = outerBand === 'firdaria' || outerBand === 'profection';
  const kDisk = bandOn ? 0.80 : 1;   // 盘沿 392*0.80=314 ≈ R_MAIN_IN 贴合无黑缝
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
  const SHADE = paper
    ? { fire: '#a82214', earth: '#7d5a0e', air: '#1c7438', water: '#1e4fa8' }
    : { fire: '#ff9c90', earth: '#f0c470', air: '#84e89e', water: '#8cc0ff' };

  // ---- 行星: 同一圈(严格等距)环形松弛 — 单环(次限)/双环(内本命+外次限) ----
  const glyphs = useMemo(() => layoutRing(chart.planets, R_PLANET, la),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chart]);
  const dualGlyphs = useMemo(() => (dualRing ? {
    inner: layoutRing(dualRing.inner, R_DUAL_IN, la),
    outer: layoutRing(dualRing.outer, R_DUAL_OUT, la),
  } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dualRing?.inner, dualRing?.outer]);

  const aspList = chart.aspects;
  const stripRing = (x: string) => x.replace(/·(?:[APTRB]|in|out)$/, '');
  const rel = (a: { a: string; b: string }) => !selected || a.a === selected || a.b === selected || stripRing(a.a) === selected || stripRing(a.b) === selected;

  // 扇区环带 path
  const sector = (rOut: number, rIn: number, a0: number, a1: number) => {
    const [p1x, p1y] = xy(rOut, a0), [p2x, p2y] = xy(rOut, a1);
    const [p3x, p3y] = xy(rIn, a1), [p4x, p4y] = xy(rIn, a0);
    const fArc = DIR === 'cw' ? 1 : 0;
    return `M ${p1x} ${p1y} A ${rOut} ${rOut} 0 0 ${fArc} ${p2x} ${p2y} L ${p3x} ${p3y} A ${rIn} ${rIn} 0 0 ${1 - fArc} ${p4x} ${p4y} Z`;
  };
  const selSign = selected ? signIdx(chart.planets.find((x) => x.name === selected)?.longitude ?? 0) : -1;

  // ---- 行星环渲染: kind=single(单环@284) / in(双环内圈本命@256) / out(双环外圈次限@300) ----
  // 双环时外环不画引线/刻度 (会穿过内环); 度分仍朝心竖排两行
  const renderRing = (gs: { p: VPlanet; a: number; realA: number }[], R: number, kind: 'single' | 'in' | 'out') => {
    const compact = kind !== 'single';
    const gSize = compact ? 21 : GLYPH_SIZE;
    const dOff1 = compact ? 18 : 21;
    const dOff2 = compact ? 28 : 32;
    const dFont = compact ? 8.2 : 8.8;
    const withLead = kind !== 'out';
    return gs.map(({ p, a, realA }) => {
      const [gx, gy] = xy(R, a);
      const [d1x, d1y] = xy(R - dOff1, a);
      const [d2x, d2y] = xy(R - dOff2, a);
      const col = SHADE[ELEMENTS[signIdx(p.longitude)] as 'fire'];
      const ringName = kind === 'in' ? p.name + '·in' : kind === 'out' ? p.name + '·out' : p.name;   // 环名分离 (合盘双环: 内/外各自独立选中)
      const isSel = selected === ringName;
      const selBase = selected ? stripRing(selected) : '';
      const selRing = selected ? (selected.endsWith('·in') ? 'in' : selected.endsWith('·out') ? 'out' : null) : null;
      const relatedSel = !!selected && chart.aspects.some((x) => {
        const eof = (n: string) => ({ b: stripRing(n), r: n.endsWith('·in') ? 'in' : n.endsWith('·out') ? 'out' : null });
        const e1 = eof(x.a), e2 = eof(x.b);
        const mine = (e: { b: string; r: string | null }) => e.b === p.name && (kind === 'single' || e.r === kind || e.r === null);
        const selm = (e: { b: string; r: string | null }) => e.b === selBase && (selRing === null || e.r === selRing || e.r === null);
        return (mine(e1) && selm(e2)) || (mine(e2) && selm(e1));
      });
      const dim = selected && !isSel && !relatedSel;
      const TAU = Math.PI * 2;
      const slipAmt = ((a - realA) % TAU + TAU * 1.5) % TAU - Math.PI;
      const slipped = Math.abs(slipAmt) > 0.052;
      const sa = realA - Math.sign(slipAmt) * 0.012;
      const [tk1x, tk1y] = xy(R_ASPECT, realA), [tk2x, tk2y] = xy(R_ASPECT + 4.5, realA);
      const [lx1, ly1] = xy(R_ASPECT + 3, sa), [lx2, ly2] = xy(R + 13, a);
      const [dg1, dg2] = fmtDeg(p.longitude);
      return (
        <g key={`${kind}-${p.name}`} data-ring={kind} data-name={p.name} onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : ringName); }} style={{ cursor: 'pointer', opacity: dim ? 0.55 : 1, transition: 'opacity 0.25s' }}>
          {withLead && <line x1={tk1x} y1={tk1y} x2={tk2x} y2={tk2y} stroke={col} strokeWidth="1.4" opacity="0.9" />}
          {withLead && slipped && <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={P.houseLine} strokeWidth="0.7" opacity="0.5" />}
          {isSel && <circle cx={gx} cy={gy} r={compact ? 12 : 13.5} fill="none" stroke={P.sel} strokeWidth="1.4" />}
          <GlyphPath name={SYMBOL_TO_GLYPH[p.symbol] ?? ''} cx={gx} cy={gy} color={col} bg={P.bg} size={gSize} />
          {p.retrograde && <text x={gx + (compact ? 12 : 14)} y={gy + 4} textAnchor="middle" fontSize={compact ? 10 : 11} fontWeight={600} fill={col} stroke={P.bg} strokeWidth="2.6" paintOrder="stroke">℞</text>}
          <text x={d1x} y={d1y + 3} textAnchor="middle" fontSize={dFont} fontWeight={600} fill={P.ink} stroke={P.bg} strokeWidth="1.4" paintOrder="stroke">{dg1}</text>
          <text x={d2x} y={d2y + 3} textAnchor="middle" fontSize={dFont} fontWeight={600} fill={P.ink} stroke={P.bg} strokeWidth="1.4" paintOrder="stroke">{dg2}</text>
        </g>
      );
    });
  };

  return (
    <div className="relative h-full w-full">
      <button
        onClick={() => setPaper((v) => !v)}
        className="absolute right-2 top-2 z-10 rounded-full border px-2.5 py-1 text-[11px]"
        style={{ borderColor: P.ring, color: P.ink, background: P.bg }}
      >
        {paper ? (zhMode ? '墨黑' : 'Dark') : (zhMode ? '纸白' : 'Paper')}
      </button>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full select-none" onClick={(e) => { if (e.target === e.currentTarget) { onSelect(null); setBandPin(null); } }}>
      {/* 盘体组: 法达/小限盘时绕中心整体缩小, 让出外圈双环带 (爸爸: 整体外径不变) */}
      <g transform={bandOn ? `translate(${C} ${C}) scale(${kDisk}) translate(${-C} ${-C})` : undefined}>
      {/* 盘沿 (无刻度带) */}
      <circle cx={C} cy={C} r={R_OUT} fill={P.bg} stroke={P.ring} strokeWidth="1.2" onClick={() => { onSelect(null); setBandPin(null) }} />
      <circle cx={C} cy={C} r={R_ASPECT} fill="none" stroke={P.ring} strokeWidth="1" />
      {/* 星座环淡彩底 (扇区=真实星座边界, 30°倍数锚定) */}
      {Array.from({ length: 12 }, (_, si) => (
        <path key={si} d={sector(R_OUT, R_SIGN_IN, la(si * 30), la(si * 30 + 30))} fill={TINT[ELEMENTS[si] as 'fire']} opacity={si === selSign ? 1 : 0.85} stroke="none" />
      ))}
      {selSign >= 0 && <path d={sector(R_OUT, R_SIGN_IN, la(selSign * 30), la(selSign * 30 + 30))} fill={P.signSel} stroke="none" />}
      {/* 环分界 */}
      <circle cx={C} cy={C} r={R_SIGN_IN} fill="none" stroke={P.ring} strokeWidth="1" />
      <circle cx={C} cy={C} r={R_HOUSE_IN} fill="none" stroke={P.ring} strokeWidth="1" />
      {/* 符号带边界参考环已删 (爸爸: 碍事) — 符号统一后不需要这两条夹线 */}
      {/* 星座边界线 + 符号 */}
      {Array.from({ length: 12 }, (_, si) => {
        const ab = la(si * 30);
        const [bx1, by1] = xy(R_SIGN_IN, ab), [bx2, by2] = xy(R_OUT, ab);
        const [mx, my] = xy(R_GLYPH, la(si * 30 + 15));
        return (
          <g key={si}>
            <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={P.ring} strokeWidth="1" />
            <GlyphPath name={ZODIAC_GLYPH_NAMES[si]} cx={mx} cy={my} color={SHADE[ELEMENTS[si] as 'fire']} size={21} />
          </g>
        );
      })}
      {/* 宫位环: 宫头灰线(非轴) + 宫号 */}
      {hasHouses && cusps!.map((c0, h) => {
        if (h % 3 === 0) return null;
        const a0 = la(c0);
        const [x1, y1] = xy(R_HOUSE_IN, a0), [x2, y2] = xy(R_SIGN_IN, a0);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={P.houseLine} strokeWidth="1" />;
      })}
      {hasHouses && cusps!.map((c0, h) => {
        const c1 = cusps![(h + 1) % 12];
        let span = wrap(c1 - c0); if (span < 1) span = 30;
        const [nx, ny] = xy(R_HOUSE_NUM, la(c0 + span / 2));
        return <text key={h} x={nx} y={ny + 5} textAnchor="middle" fontSize="13" fill={P.ink} fontWeight={h % 3 === 0 ? 700 : 400}>{h + 1}</text>;
      })}
      {/* 四轴: 两段轴辐条 (爸爸: 删中心部分 — 不穿相位区, 内圆里不画) */}
      {hasHouses && [cusps![0], cusps![9]].map((lon, i) => {
        const a = la(lon);
        const [ox, oy] = xy(R_OUT - 1, a);
        const [ix, iy] = xy(R_ASPECT, a);
        return (
          <g key={i}>
            <line x1={ox} y1={oy} x2={ix} y2={iy} stroke={P.axis} strokeWidth={i === 0 ? 1.6 : 1.2} />
            <line x1={SIZE - ox} y1={SIZE - oy} x2={SIZE - ix} y2={SIZE - iy} stroke={P.axis} strokeWidth={i === 0 ? 1.6 : 1.2} />
          </g>
        );
      })}
      {/* 角标在盘体组外 (下面单独渲染): 法达盘挂最外环之外 (爸爸: ASC标到最外面) */}
      {/* 相位弦线: 端点=真实度数落在内圆边界, 四色细线 */}
      {aspList.map((a, i) => {
        // 四轴端点: 轴点黄经(ASC/MC直取, DSC/IC=对宫) → 与角标同位置; glyphs 只有行星
        const AX_ANGLE: Record<string, number> = {
          Ascendant: chart.angles.ascendant?.longitude ?? NaN,
          Midheaven: chart.angles.midheaven?.longitude ?? NaN,
          Descendant: chart.angles.ascendant ? wrap(chart.angles.ascendant.longitude + 180) : NaN,
          IC: chart.angles.midheaven ? wrap(chart.angles.midheaven.longitude + 180) : NaN,
        };
        const nmStrip = (x: string) => x.replace(/·(?:[APTRB]|in|out)$/, '');   // ·P/·T/·R/·A/·B/·in/·out
        const angOf = (n: string) => {
          // 合盘 内环端 (·in / ·A): 内环盘的点表 (extraPoints)
          if (n.endsWith('·in') || n.endsWith('·A')) {
            const bareA = nmStrip(n);
            return extraPoints && extraPoints[bareA] !== undefined ? la(extraPoints[bareA]) : null;
          }
          const hasSfx = n !== nmStrip(n);
          if (!hasSfx && extraPoints && extraPoints[n] !== undefined) return la(extraPoints[n]);   // 原名 → 本命点优先
          const bare = nmStrip(n);
          const g = glyphs.find((x) => x.p.name === bare);
          if (g) return g.realA;                       // 盘上符号 (后缀名剥后也查: 推运星)
          const ax = AX_ANGLE[bare] ?? (bare === 'ASC' && chart.angles.ascendant ? chart.angles.ascendant.longitude : undefined) ?? (bare === 'MC' && chart.angles.midheaven ? chart.angles.midheaven.longitude : undefined) ?? (bare === 'DSC' && chart.angles.ascendant ? wrap(chart.angles.ascendant.longitude + 180) : undefined) ?? (bare === 'IC' && chart.angles.midheaven ? wrap(chart.angles.midheaven.longitude + 180) : undefined);
          return ax === undefined || Number.isNaN(ax) ? null : la(ax);
        };
        const ra = angOf(a.a), rb = angOf(a.b);
        if (ra === null || rb === null) return null;
        const [x1, y1] = xy(R_ASPECT, ra), [x2, y2] = xy(R_ASPECT, rb);
        const hot = rel(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={aspectHex(a.type)} strokeWidth={selected && hot ? 1.8 : 0.9} opacity={selected ? (hot ? 0.95 : 0.06) : 0.38} style={{ transition: 'opacity 0.25s' }} />;
      })}
      {/* 行星符号环: 单环(次限)/双环(内=本命@256, 外=次限@300); 严格等距; 滑移>3°画引线+内圆真度刻度 */}
      {dualRing && dualGlyphs ? (
        <>
          {renderRing(dualGlyphs.inner, R_DUAL_IN, 'in')}
          {renderRing(dualGlyphs.outer, R_DUAL_OUT, 'out')}
        </>
      ) : (
        renderRing(glyphs, R_PLANET, 'single')
      )}
      </g>
      {/* 角标 (缩放组外·绝对坐标): 普通盘=盘沿外15/29 不变; 法达/小限盘=挂最外环之外 (爸爸: ASC标到最外面, 别夹在中间黑环) */}
      {hasHouses && [cusps![0], cusps![3], cusps![6], cusps![9]].map((lon, i) => {
        const lab = ['ASC', 'IC', 'DSC', 'MC'][i];
        const a = la(lon);
        const off1 = bandOn ? 24 : 15, off2 = bandOn ? 38 : 29;
        const base = bandOn ? R_SUB_OUT : R_OUT;
        const [bx, by] = xy(base + off1, a);
        const [dx, dy] = xy(base + off2, a);
        const [dg1, dg2] = fmtDeg(lon);
        return (
          <g key={i}>
            <text x={bx} y={by + 4.5} textAnchor="middle" fontSize="13.5" fontWeight={700} fill={paper ? '#c25d84' : '#d9a8b8'}>{lab}</text>
            <text x={dx} y={dy + 4} textAnchor="middle" fontSize="9.5" fill={P.ink} opacity="0.8">{dg1}{dg2}</text>
          </g>
        );
      })}
      {/* ---- 法达双环 (爸爸定稿 v2, 测测同款): 只保持一种色 — 已走过=无色, 未走过=主题色; 符号旋转沿弧全量显示; 年纪在环内 ---- */}
      {outerBand === 'firdaria' && firRows && firPeriods && (() => {
        const yearA = (age: number) => Math.PI / 2 - (age / 75) * Math.PI * 2;   // 12点起顺时针, 75年一圈
        const curAgeD = (Date.now() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / (365.2425 * 86400000);
        const SYM_OF: Record<string, string> = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', NorthNode: '☊', SouthNode: '☋' };
        const arcCw = (rIn: number, rOut: number, a0: number, a1: number) => {
          const [x1, y1] = xy(rOut, a0), [x2, y2] = xy(rOut, a1), [x3, y3] = xy(rIn, a1), [x4, y4] = xy(rIn, a0);
          return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
        };
        const THEME = paper ? '#c25d84' : '#d9a8b8';               // 主题色 (未走过)
        const PASTC = paper ? '#9aa3af' : '#8a93a3';               // 无色档 (已走过)
        const rotAt = (a: number) => { let d = 90 - a * 180 / Math.PI; d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; };  // 符号顶朝外沿弧旋转
        const R_MAIN_MID = (R_MAIN_IN + R_MAIN_OUT) / 2;
        const R_SUB_MID = (R_SUB_IN + R_SUB_OUT) / 2;
        return (
          <>
            {/* 大运环 (内): 9主段 — 符号居中旋转沿弧 + 起运年纪在环内边界; 当前段高亮 */}
            {firPeriods.map((m, i) => {
              const a0 = yearA(m.startAge), a1 = yearA(m.endAge);
              const isNow = curAgeD >= m.startAge && curAgeD < m.endAge;
              const isPast = curAgeD >= m.endAge;
              const hov = mainHover === i || (bandPin?.kind === 'main' && bandPin.idx === i);
              const mid = (a0 + a1) / 2;
              const [gx, gy] = xy(R_MAIN_MID + 8, mid);
              const [tx, ty] = xy(R_MAIN_MID - 2, a0);
              return (
                <g key={`main-${i}`}
                  onMouseEnter={() => setMainHover(i)} onMouseLeave={() => setMainHover(null)}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setBandPin({ kind: 'main', idx: i }); }}
                >
                  <path d={arcCw(R_MAIN_IN, R_MAIN_OUT, a0, a1)}
                    fill={isPast ? (paper ? 'rgba(120,130,145,0.10)' : 'rgba(148,163,184,0.07)') : THEME}
                    fillOpacity={isPast ? 1 : (isNow ? (hov ? 0.66 : 0.5) : (hov ? 0.44 : 0.26))}
                    stroke={isNow ? THEME : P.ring} strokeWidth={isNow ? 1.4 : 0.8} strokeOpacity={isNow ? 1 : 0.6} />
                  <g transform={`rotate(${rotAt(mid)} ${gx} ${gy})`}>
                    <GlyphPath name={SYMBOL_TO_GLYPH[SYM_OF[m.lord]] ?? ''} cx={gx} cy={gy} color={isPast ? PASTC : (isNow ? '#ffd75e' : THEME)} bg={P.bg} size={hov ? 19 : 17} />
                  </g>
                  <g transform={`rotate(${rotAt(a0)} ${tx} ${ty})`}>
                    <text x={tx} y={ty + 3.5} textAnchor="middle" fontSize="10" fontWeight={600} fill={isPast ? PASTC : THEME} stroke={P.bg} strokeWidth="2.4" paintOrder="stroke">{Math.round(m.startAge)}岁</text>
                  </g>
                </g>
              );
            })}
            {/* 小运环 (外): 61子段 — 符号旋转沿弧全量显示 (不再省略窄段, 爸爸: 有空白) */}
            {firRows.map((r, i) => {
              const a0 = yearA(r.startAge), a1 = yearA(r.endAge);
              const isNow = curAgeD >= r.startAge && curAgeD < r.endAge;
              const isPast = curAgeD >= r.endAge;
              const lord = r.sub ?? r.lord;
              const hov = bandHover === i || (bandPin?.kind === 'sub' && bandPin.idx === i);
              const isMainStart = firPeriods.some((m) => m.startAge === r.startAge);
              const mid = (a0 + a1) / 2;
              const [sx, sy] = xy(R_SUB_MID, mid);
              return (
                <g key={`sub-${i}`}
                  onMouseEnter={() => setBandHover(i)} onMouseLeave={() => setBandHover(null)}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setBandPin({ kind: 'sub', idx: i }); }}
                >
                  <path d={arcCw(R_SUB_IN, R_SUB_OUT, a0, a1)}
                    fill={isPast ? (paper ? 'rgba(120,130,145,0.10)' : 'rgba(148,163,184,0.07)') : THEME}
                    fillOpacity={isPast ? 1 : (isNow ? (hov ? 0.62 : 0.45) : (hov ? 0.42 : 0.24))}
                    stroke={isMainStart ? THEME : P.ring} strokeWidth={isMainStart ? 1 : 0.5} strokeOpacity={isMainStart ? 0.9 : 0.5} />
                  <g transform={`rotate(${rotAt(mid)} ${sx} ${sy})`}>
                    <GlyphPath name={SYMBOL_TO_GLYPH[SYM_OF[lord]] ?? ''} cx={sx} cy={sy}
                      color={isPast ? PASTC : (isNow ? '#ffd75e' : THEME)} bg={P.bg} size={hov ? 16 : 13.5} />
                  </g>
                </g>
              );
            })}
          </>
        )
      })()}

      {/* ---- 外圈信息带: 小限环 (每宫一段, 段内=宫头星座庙主星单字) ---- */}
      {outerBand === 'profection' && hasHouses && cusps!.map((c0, h) => {
        const c1 = cusps![(h + 1) % 12];
        const a0 = la(c0), a1 = la(c1);
        const lord = SIGN_RULER[signIdx(c0)];
        const LORD_ZH: Record<string, string> = { Sun: '日', Moon: '月', Mercury: '水', Venus: '金', Mars: '火', Jupiter: '木', Saturn: '土' };
        const curAge = Math.max(0, Math.floor((Date.now() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / (365.2425 * 86400000)));
        const curHouse = (curAge % 12) + 1;
        const isNow = curHouse === h + 1;
        const [tx, ty] = xy((R_SUB_IN + R_SUB_OUT) / 2, (a0 + a1) / 2);
        return (
          <g key={`prof-${h}`}>
            <path d={sector(R_SUB_OUT, R_SUB_IN, a0, a1)} fill={isNow ? 'rgba(217,168,184,0.20)' : (h % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.06)')} stroke={P.ring} strokeWidth="0.8" />
            <text x={tx} y={ty + 5} textAnchor="middle" fontSize="15" fontWeight={600} fill={isNow ? '#d9a8b8' : P.ink} opacity={isNow ? 1 : 0.8}>{LORD_ZH[lord] ?? '?'}</text>
          </g>
        );
      })}
      </svg>
      {/* 法达环信息浮层: 悬停显示; 点击钉住 (爸爸: 点击只弹窗不跳转, 防误触; 弹窗内按钮才跳) */}
      {outerBand === 'firdaria' && (() => {
        const act = bandPin ?? (mainHover !== null ? { kind: 'main' as const, idx: mainHover } : bandHover !== null ? { kind: 'sub' as const, idx: bandHover } : null)
        if (!act || !firRows || !firPeriods) return null
        const LORD_ZH: Record<string, string> = { Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', NorthNode: '北交点', SouthNode: '南交点' }
        const birthMs = Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)
        const toDate = (age: number) => new Date(birthMs + Math.round(age * 365.2425 * 86400000))
        const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        let lord = '', sub = '', sAge = 0, eAge = 0, jy = 0, jm = 1, jd = 1
        const c = paper ? '#c25d84' : '#d9a8b8'   // 爸爸: 法达只保持一种主题色 (浮层同源)
        if (act.kind === 'main') {
          const m = firPeriods[act.idx]; if (!m) return null
          lord = m.lord; sAge = m.startAge; eAge = m.endAge
          const row = firRows.find((r) => Math.abs(r.startAge - m.startAge) < 1e-6)
          jy = row?.y ?? chart.input.year; jm = row?.m ?? chart.input.month; jd = row?.d ?? chart.input.day
        } else {
          const r = firRows[act.idx]; if (!r) return null
          lord = r.lord; sub = r.sub && r.sub !== r.lord ? r.sub : ''
          sAge = r.startAge; eAge = r.endAge; jy = r.y; jm = r.m; jd = r.d
        }
        const pinned = !!bandPin && bandPin.kind === act.kind && bandPin.idx === act.idx
        return (
          <div className={`absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-xl border px-3.5 py-2 text-[11.5px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${pinned ? '' : 'pointer-events-none'}`}
            style={{ borderColor: c + '66', background: 'rgba(10,14,25,0.96)', color: '#dbe4f5' }}>
            <span style={{ color: c }} className="font-semibold">
              {zhMode ? `${LORD_ZH[lord] ?? lord}大运` : `${lord} period`}
              {sub && (zhMode ? ` · ${LORD_ZH[sub] ?? sub}小运` : ` · ${sub} sub`)}
            </span>
            <span className="ml-2 tabular-nums text-muted">{jy}-{String(jm).padStart(2, '0')}-{String(jd).padStart(2, '0')} → {fmt(toDate(eAge))}</span>
            <span className="ml-2 text-muted/60">{Math.round(sAge)}–{Math.round(eAge)}{zhMode ? '岁' : 'y'}</span>
            {pinned ? (
              <span className="ml-2 inline-flex gap-1.5">
                <button className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-accent hover:bg-accent/25"
                  onClick={() => { onBandDate?.(jy, jm, jd); setBandPin(null) }}>{zhMode ? '跳转此时起排盘' : 'jump chart'}</button>
                <button className="rounded-md border border-white/15 px-2 py-0.5 text-muted hover:text-foreground"
                  onClick={() => setBandPin(null)}>✕</button>
              </span>
            ) : <span className="ml-2 text-accent/60">{zhMode ? '点击可钉住·防误触' : 'click to pin'}</span>}
          </div>
        )
      })()}
    </div>
  );
}
