'use client';

// ============================================================
// 经典线条盘 (view=classic) — 复刻宫神星线条盘结构, SVG 矢量
// 圈层(外→内): 刻度针脚+度数带 → 星座环(四元素彩色符号+边界起度) →
//   宫位环(灰宫头线+宫号, 四轴加深) → 内圆(相位弦四色)
// 行星: 单独圈按真实角度摆, 符号+度分两组黑描边防叠; 拥挤=整组径向内移
// 纸白/墨黑双主题切换; 数据与3D盘同源同角映射(lonToAngle逐位一致)
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
const SIGNS_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGNS_ZH = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const ELEMENTS = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];

const SIZE = 880, C = SIZE / 2;
const R_OUT = 410;            // 外边界
const R_DEG = 396;            // 星座起度数字位
const R_SIGN_OUT = 384, R_SIGN_IN = 316;   // 星座环
const R_GLYPH_SIGN = 350;     // 星座符号位
const R_HOUSE_IN = 250;       // 宫位环内缘 = 内圆边界
const R_HOUSE_NUM = 282;      // 宫号位
const R_PLANET = 204;         // 行星符号基准圈 (拥挤整组沿径向向内让)

const xy = (r: number, a: number) => [C + r * Math.cos(a), C - r * Math.sin(a)] as const;
const fmtDeg = (lon: number) => {
  const L = ((lon % 30) + 30) % 30;
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

  // ---- 双主题调色 ----
  const P = paper
    ? { bg: '#ffffff', ink: '#0f1626', ring: '#aeb6c2', houseLine: '#9aa4b2', axis: '#39424f', signDiv: '#c3c9d2', signSel: 'rgba(43,110,217,0.10)', sel: '#a9821f' }
    : { bg: '#0a0f1e', ink: '#dbe4f5', ring: 'rgba(148,163,196,0.45)', houseLine: 'rgba(148,163,196,0.42)', axis: '#c7d2e8', signDiv: 'rgba(148,163,196,0.22)', signSel: 'rgba(96,165,250,0.16)', sel: '#ffd75e' };
  const EL = paper
    ? { fire: '#cf3d33', earth: '#2e7d32', air: '#1e6fd9', water: '#2b3a42' }
    : { fire: '#f87171', earth: '#4ade80', air: '#60a5fa', water: '#9fb3c8' };
  // 行星固定色 (宫神星同款): 日火红 / 金木绿 / 月水土蓝 / 其余墨
  const PC: Record<string, string> = { Sun: EL.fire, Mars: EL.fire, Venus: EL.earth, Jupiter: EL.earth, Moon: EL.air, Mercury: EL.air, Saturn: EL.air, Uranus: P.ink, Neptune: P.ink, Pluto: P.ink };

  // ---- 行星: 真实角绝不移位; 拥挤时整组沿径向向内让层 (宫神星做法) ----
  const glyphs = useMemo(() => {
    const items = chart.planets.map((p) => ({ p, a: la(p.longitude) })).sort((x, y) => x.a - y.a);
    const out: { p: VChart['planets'][0]; a: number; slot: number }[] = [];
    const used: { x: number; y: number }[] = [];   // 已放组标签块中心像素位
    const GAP = 46;                                 // 组间最小净距
    for (const it of items) {
      let slot = 0;
      let pos = xy(R_PLANET - slot * 30, it.a);
      while (slot < 5 && used.some((u) => Math.hypot(u.x - pos[0], u.y - pos[1]) < GAP)) {
        slot++; pos = xy(R_PLANET - slot * 30, it.a);
      }
      used.push({ x: pos[0], y: pos[1] });
      out.push({ ...it, slot });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  const aspList = chart.aspects;
  const rel = (a: { a: string; b: string }) => !selected || a.a === selected || a.b === selected;

  // 选中星所在星座 → 淡蓝高亮
  const selSign = useMemo(() => {
    if (!selected) return -1;
    const p = chart.planets.find((x) => x.name === selected);
    return p ? Math.floor((((p.longitude % 360) + 360) % 360) / 30) : -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, chart]);
  const signOf = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);

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
      {/* 盘底 + 外边界 */}
      <circle cx={C} cy={C} r={R_OUT} fill={P.bg} stroke={P.ring} strokeWidth="1.2" onClick={() => onSelect(null)} />
      {/* 环分界圆 (浅灰细线三圈) */}
      {[R_SIGN_OUT, R_SIGN_IN, R_HOUSE_IN].map((r, i) => <circle key={i} cx={C} cy={C} r={r} fill="none" stroke={P.ring} strokeWidth="1" />)}
      {/* 选中星座淡蓝高亮 */}
      {selSign >= 0 && (() => {
        const s = signOf(ascLon) !== -1 ? selSign : -1;
        const a0 = la(((Math.floor(ascLon / 30) * 30 + s * 30) % 360 + 360) % 360);
        const a1 = a0 + (DIR === 'cw' ? -1 : 1) * (Math.PI / 6);
        const [p1x, p1y] = xy(R_SIGN_OUT, a0), [p2x, p2y] = xy(R_SIGN_OUT, a1);
        const [p3x, p3y] = xy(R_SIGN_IN, a1), [p4x, p4y] = xy(R_SIGN_IN, a0);
        return <path d={`M ${p1x} ${p1y} A ${R_SIGN_OUT} ${R_SIGN_OUT} 0 0 ${DIR === 'cw' ? 1 : 0} ${p2x} ${p2y} L ${p3x} ${p3y} A ${R_SIGN_IN} ${R_SIGN_IN} 0 0 ${DIR === 'cw' ? 0 : 1} ${p4x} ${p4y} Z`} fill={P.signSel} stroke="none" />;
      })()}
      {/* 刻度: 5°细灰针 / 10°中针 (30°宫界已有长线不重复) */}
      {Array.from({ length: 72 }, (_, k) => k * 5).map((lon) => {
        if (lon % 30 === 0) return null;
        const a = la(lon);
        const med = lon % 10 === 0;
        const [x1, y1] = xy(R_SIGN_OUT, a), [x2, y2] = xy(med ? R_OUT : R_OUT - 3.5, a);
        return <line key={lon} x1={x1} y1={y1} x2={x2} y2={y2} stroke={P.houseLine} strokeWidth={med ? 0.9 : 0.6} opacity={med ? 0.9 : 0.55} />;
      })}
      {/* 星座环: 边界短线+起度数字 / 环中央彩色星座名(汉字防廉价) */}
      {Array.from({ length: 12 }, (_, k) => {
        const bSign = (((Math.floor(ascLon / 30) * 30 + k * 30) % 360) + 360) % 360;
        const ab = la(bLonWrap(bSign));
        const [bx1, by1] = xy(R_SIGN_IN, ab), [bx2, by2] = xy(R_OUT, ab);
        const am = la(bLonWrap(bSign + 15));
        const [mx, my] = xy(R_GLYPH_SIGN, am);
        const [dx, dy] = xy(R_DEG, ab);
        const si = signIdxAbs(bSign);
        return (
          <g key={k}>
            <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={P.signDiv} strokeWidth="1" />
            <text x={dx} y={dy + 4} textAnchor="middle" fontSize="11" fill={P.ink} opacity="0.85">{bSign}°</text>
            <text x={mx} y={my + 6} textAnchor="middle" fontSize="16" fontWeight={600} fill={EL[ELEMENTS[si] as 'fire']}>
              {zhMode ? SIGNS_ZH[si] : SIGNS_GLYPH[si]}
            </text>
          </g>
        );
      })}
      {/* 宫位环: 宫头线灰细/四轴加深 + 宫号 */}
      {hasHouses && cusps!.map((c0, h) => {
        const c1 = cusps![(h + 1) % 12];
        let span = ((c1 - c0) % 360 + 360) % 360; if (span < 1) span = 30;
        const a0 = la(c0), isAcs = h % 3 === 0;
        const [x1, y1] = xy(R_HOUSE_IN, a0), [x2, y2] = xy(R_SIGN_OUT, a0);
        const [nx, ny] = xy(R_HOUSE_NUM, la(c0 + span / 2));
        return (
          <g key={h}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isAcs ? P.axis : P.houseLine} strokeWidth={isAcs ? 1.8 : 0.9} />
            <text x={nx} y={ny + 5} textAnchor="middle" fontSize="14" fill={P.ink} fontWeight={isAcs ? 700 : 400}>{h + 1}</text>
          </g>
        );
      })}
      {/* 四轴贯穿线 + 玫红角标 + 轴点度数 */}
      {hasHouses && [cusps![0], cusps![9]].map((lon, i) => {
        const a = la(lon);
        const [x1, y1] = xy(R_HOUSE_IN, a), [x2, y2] = xy(R_SIGN_OUT, a);
        return <line key={i} x1={x1} y1={y1} x2={SIZE - x1} y2={SIZE - y1} stroke={P.axis} strokeWidth={i === 0 ? 1.8 : 1.4} />;
      })}
      {hasHouses && [[cusps![0], 'ASC', 0.05], [cusps![3], 'IC', -0.06], [cusps![6], 'DSC', -0.05], [cusps![9], 'MC', 0.06]].map(([lon, lab, off], i) => {
        const a = la(lon as number) + (off as number);
        const [x, y] = xy(R_OUT - 13, a);
        return (
          <g key={i}>
            <text x={x} y={y + 4} textAnchor="middle" fontSize="13" fontWeight={700} fill="#d9a8b8">{lab}</text>
            <text x={x} y={y + (asOffPos(off as number) ? 16 : -12)} textAnchor="middle" fontSize="9.5" fill={P.ink} opacity="0.8">{fmtDeg(lon as number)}</text>
          </g>
        );
      })}
      {/* 相位弦线: 端点=真实度数落在内圆边界, 四色细线 */}
      {aspList.map((a, i) => {
        const ga = glyphs.find((g) => g.p.name === a.a), gb = glyphs.find((g) => g.p.name === a.b);
        if (!ga || !gb) return null;
        const [x1, y1] = xy(R_HOUSE_IN, ga.a), [x2, y2] = xy(R_HOUSE_IN, gb.a);
        const hot = rel(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={aspectHex(a.type)} strokeWidth={selected && hot ? 1.8 : 1} opacity={selected ? (hot ? 0.95 : 0.08) : 0.55} style={{ transition: 'opacity 0.25s' }} />;
      })}
      {/* 行星组: 彩色符号 + 度分黑字 (径向内移防叠; 选中=金环+引针到内圈) */}
      {glyphs.map(({ p, a, slot }) => {
        const r = R_PLANET - slot * 30;
        const [gx, gy] = xy(r, a);
        const col = PC[p.name] ?? P.ink;
        const isSel = selected === p.name;
        const relatedSel = selected && chart.aspects.some((x) => (x.a === p.name || x.b === p.name) && (x.a === selected || x.b === selected));
        const dim = selected && !isSel && !relatedSel;
        const [lx1, ly1] = xy(R_HOUSE_IN, a), [lx2, ly2] = xy(r + 14, a);
        return (
          <g key={p.name} onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : p.name); }} style={{ cursor: 'pointer', opacity: dim ? 0.55 : 1, transition: 'opacity 0.25s' }}>
            {isSel && <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={P.sel} strokeWidth="1" opacity="0.75" />}
            {isSel && <circle cx={gx} cy={gy} r="15" fill="none" stroke={P.sel} strokeWidth="1.4" />}
            <text x={gx} y={gy + 6} textAnchor="middle" fontSize="17" fontWeight={600} fill={col} stroke={P.bg} strokeWidth="2.4" paintOrder="stroke">{p.symbol}{p.retrograde ? '℞' : ''}</text>
            <text x={gx} y={gy + 21} textAnchor="middle" fontSize="10.5" fill={P.ink} stroke={P.bg} strokeWidth="2" paintOrder="stroke">{fmtDeg(p.longitude)}</text>
          </g>
        );
      })}
      </svg>
    </div>
  );
}

// 工具: 星座起度取模回 0-359; 绝对星座序
function bLonWrap(lon: number) { return ((lon % 360) + 360) % 360; }
function signIdxAbs(lon: number) { return Math.floor(bLonWrap(lon) / 30); }
function asOffPos(off: number) { return off >= 0; }
