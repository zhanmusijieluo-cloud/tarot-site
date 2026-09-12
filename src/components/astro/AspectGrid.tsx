'use client';

// ============================================================
// 相位网格表 (宫神星/astro.com 同款下三角矩阵)
// 自适应: 列宽=容器/N, 零横滚; 有相位格才出高度(带最小高), 无相位格压扁成条纹
// 格内: 相位符号 + 偏差° + A/S; 颜色按相位性质; 点击行头/列头联动星盘
// ============================================================

import type { VAspect, VChart } from '@/components/astro/ChartWheel';

// 相位配色: 红=困难(刑冲) 绿/蓝=和谐(拱/六合) 金=合 紫=梅花
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

/** 图例行 (可独立复用于星盘下方) */
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
  /** (保留参数兼容) 旧固定格宽, 现改为容器自适应 */
  cellPx?: number;
  /** 空间不足场景隐藏图例 */
  hideLegend?: boolean;
}) {
  // 列 = 盘上天体顺序 (与盘一致); 数量大时限 14 保证可读
  const cols = chart.planets.slice(0, 14);
  const n = cols.length + 1; // +1 行头列
  const dense = cols.length >= 13; // 栏宽有限: 天体一多只画符号不画数字, 保清晰
  const symFs = dense ? 10 : 13

  // 相位查表: "a|b" 双向
  const byPair = new Map<string, VAspect>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }
  const cellOf = (x: string, y: string) => (x === y ? null : byPair.get(`${x}|${y}`) ?? null);

  return (
    <div className={bare ? '' : 'rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3'}>
      <table className="w-full border-separate" style={{ borderSpacing: '2px', tableLayout: 'fixed' }}>
        <colgroup>
          {Array.from({ length: n }, (_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: '1.9em' }} />
            {cols.map((c) => (
              <th key={c.name} className="p-0">
                <button
                  onClick={() => onPick?.(selected === c.name ? null : c.name)}
                  className={`mx-auto flex aspect-square w-full max-w-[34px] items-center justify-center rounded-[5px] text-[13px] leading-none transition-colors ${dense ? 'text-[10px]!' : ''} ${
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
                  className={`flex aspect-square w-full items-center justify-center rounded-[5px] text-[13px] leading-none transition-colors ${
                    selected === row.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  }`}
                  title={zhMode ? row.zh : row.name}
                >
                  {row.symbol}{row.retrograde && <sup className="text-[7px] text-[#e8a08a]">R</sup>}
                </button>
              </td>
              {cols.map((col, ci) => {
                // 上三角/对角: 压扁成细条纹, 不占高度 (这就是"不用滚就能看全"的关键)
                if (ci >= ri) return <td key={col.name} className="h-[5px] rounded-[4px] bg-white/[0.035] p-0" />;
                const a = cellOf(row.name, col.name);
                if (!a) return <td key={col.name} className="h-[5px] rounded-[4px] bg-white/[0.05] p-0" />;
                const color = ASPECT_COLOR[a.type] ?? '#9aa3b5';
                return (
                  <td
                    key={col.name}
                    className="rounded-[4px] text-center align-middle"
                    style={{ background: `${color}30`, color }}
                    title={`${row.symbol} ${col.symbol} ${a.typeZh} ±${a.orb.toFixed(1)}°`}
                  >
                    <div className="flex aspect-square w-full flex-col items-center justify-center leading-none">
                      <span style={{ fontSize: symFs, lineHeight: 1.05 }}>{a.symbol}</span>
                      <span style={{ fontSize: dense ? 6.5 : 8, opacity: 0.95, letterSpacing: '-0.3px' }}>{a.orb.toFixed(1)}{a.applying === true ? 'A' : a.applying === false ? 'S' : ''}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* 图例 */}
      {!hideLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] text-muted/70">
          {legendItems(zhMode).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1">
              <span style={{ color: ASPECT_COLOR[k] }}>{SYM[k]}</span>{label}
            </span>
          ))}
          <span className="ml-auto">{zhMode ? 'A=入相 S=出相 · 数字=偏差°' : 'A=applying S=separating · orb°'}</span>
        </div>
      )}
    </div>
  );
}
