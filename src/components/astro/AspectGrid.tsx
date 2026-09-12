'use client';

// ============================================================
// 相位网格表 (学宫神星/astro.com 的下三角矩阵)
// 行×列 = 天体两两相位; 格内=相位符号+度数差+A/S(入/出相); 颜色按相位性质
// 点击行头/列头 = 联动高亮盘上天体 (onPick 回调)
// ============================================================

import type { VAspect, VChart } from '@/components/astro/ChartWheel';

// 相位配色: 红=困难(刑冲/梅花/半刑类) 蓝绿=和谐(拱六合) 金=合
const ASPECT_COLOR: Record<string, string> = {
  conjunction: '#cdb88a',
  opposition: '#e8a08a',
  square: '#e07f7f',
  trine: '#7fb8a4',
  sextile: '#8aa8d8',
  quincunx: '#c48fd8',
  'semi-square': '#d8a47f',
  'sesquiquadrate': '#d8a47f',
  'semi-sextile': '#9aa3b5',
  quintile: '#8fd8d0',
  biquintile: '#8fd8d0',
  septile: '#b0a8d8',
  novile: '#b0a8d8',
  decile: '#b0a8d8',
};

const SYM: Record<string, string> = { conjunction: '☌', opposition: '☍', square: '□', trine: '△', sextile: '⚹', quincunx: '⚻' };
// 图例用固定符号表 (不依赖当前盘是否恰好含该相位)
const legendItems = (zhMode: boolean): [string, string][] => [
  ['conjunction', zhMode ? '合' : 'Conj'], ['opposition', zhMode ? '冲' : 'Opp'],
  ['square', zhMode ? '刑' : 'Sqt'], ['trine', zhMode ? '拱' : 'Tri'],
  ['sextile', zhMode ? '六合' : 'Sxt'], ['quincunx', zhMode ? '梅花' : 'Qnx'],
];

/** 图例行 (垫底模式下由外部渲染在星盘下方) */
export function AspectLegend({ zhMode }: { zhMode: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {legendItems(zhMode).map(([k, label]) => (
        <span key={k} className="flex items-center gap-1">
          <span style={{ color: ASPECT_COLOR[k] }}>{SYM[k]}</span>{label}
        </span>
      ))}
      <span className="text-muted/50">{zhMode ? 'A=入相 S=出相 · 数字=偏差°' : 'A=applying S=separating · orb°'}</span>
    </span>
  );
}

export default function AspectGrid({ chart, zhMode, onPick, selected, bare, cellPx, hideLegend }: {
  chart: VChart;
  zhMode: boolean;
  onPick?: (name: string | null) => void;
  selected?: string | null;
  /** 嵌入已有面板时去掉外层边框与背景 */
  bare?: boolean;
  /** 格子边长 px (与星盘重叠垫底时给大些, 默认28) */
  cellPx?: number;
  /** 垫在圆盘背后时图例没地方放, 可隐藏 */
  hideLegend?: boolean;
}) {
  // 列 = 盘上天体顺序 (与盘一致); 数量大时限 14 保证可读
  const cols = chart.planets.slice(0, 14);

  // 相位查表: "a|b" 双向
  const byPair = new Map<string, VAspect>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }

  const sym = (n: string) => chart.planets.find((p) => p.name === n)?.symbol ?? n[0];
  const cell = (x: string, y: string) => {
    if (x === y) return null;
    return byPair.get(`${x}|${y}`) ?? null;
  };
  const dim = (x: string, y: string, v: number) => (v >= 4 ? 1 : 0.55 + v * 0.1);

  const gs = cellPx ?? 28
  return (
    <div style={{ ['--gs' as never]: `${gs}px` }} className={bare ? 'overflow-x-auto' : 'overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3'}>
      <table className="border-separate" style={{ borderSpacing: '2px' }}>
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c.name} className="p-0">
                <button
                  onClick={() => onPick?.(selected === c.name ? null : c.name)}
                  style={{ width: 'var(--gs)', height: 'var(--gs)' }}
                  className={`flex items-center justify-center rounded-md text-[13px] transition-colors ${
                    selected === c.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  }`}
                  title={zhMode ? c.zh : c.name}
                >
                  {c.symbol}{c.retrograde && <sup className="text-[7px] text-[#e8a08a]">R</sup>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((row, ri) => (
            <tr key={row.name}>
              <td className="p-0">
                <button
                  onClick={() => onPick?.(selected === row.name ? null : row.name)}
                  style={{ width: 'var(--gs)', height: 'var(--gs)' }}
                  className={`flex items-center justify-center rounded-md text-[13px] transition-colors ${
                    selected === row.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  }`}
                  title={zhMode ? row.zh : row.name}
                >
                  {row.symbol}{row.retrograde && <sup className="text-[7px] text-[#e8a08a]">R</sup>}
                </button>
              </td>
              {cols.map((col, ci) => {
                if (ci >= ri) return <td key={col.name} style={{ width: 'var(--gs)', height: 'var(--gs)' }} className="rounded-md bg-white/[0.02]" />; // 上三角留空底, 对角不画
                const a = cell(row.name, col.name);
                if (!a) return <td key={col.name} style={{ width: 'var(--gs)', height: 'var(--gs)' }} className="rounded-md bg-white/[0.03]" />;
                const color = ASPECT_COLOR[a.type] ?? '#9aa3b5';
                return (
                  <td
                    key={col.name}
                    className="select-none rounded-md text-center align-middle"
                    style={{ width: 'var(--gs)', height: 'var(--gs)', background: `${color}14`, color, opacity: dim(row.name, col.name, 10 - Math.min(a.orb, 9)) }}
                    title={`${row.symbol} ${col.symbol} ${a.typeZh} ±${a.orb.toFixed(1)}°`}
                  >
                    <span style={{ fontSize: 'calc(var(--gs) * 0.44)', lineHeight: 1.15 }}>{a.symbol}</span>
                    <div className="opacity-80" style={{ fontSize: 'calc(var(--gs) * 0.24)', lineHeight: 1.05 }}>
                      {a.orb.toFixed(1)}
                      {a.applying === true ? 'A' : a.applying === false ? 'S' : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* 图例 */}
      {!hideLegend && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] text-muted/70">
        {legendItems(zhMode).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1">
            <span style={{ color: ASPECT_COLOR[k] }}>{SYM[k]}</span>{label}
          </span>
        ))}
        <span className="ml-auto">{zhMode ? 'A=入相 S=出相 · 数字=偏差°' : 'A=applying S=separating · orb°'}</span>
      </div>}
    </div>
  );
}
