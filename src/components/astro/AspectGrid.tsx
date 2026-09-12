'use client';

// ============================================================
// 相位网格表 (宫神星/astro.com 同款下三角矩阵)
// 定稿版: 全矩阵等宽等高正方格 (含空格), 列头严格对位, 无斑马条纹
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
  /** (保留参数兼容) 现由容器自适应 */
  cellPx?: number;
  /** 空间不足场景隐藏图例 */
  hideLegend?: boolean;
}) {
  // 列 = 盘上天体顺序 (与盘一致); 数量大时限 14 保证可读
  const cols = chart.planets.slice(0, 14);
  const n = cols.length;
  const dense = n >= 13; // 天体多时符号/数字缩小, 但仍是完整正方格矩阵

  // 相位查表: "a|b" 双向
  const byPair = new Map<string, VAspect>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }
  const cellOf = (x: string, y: string) => (x === y ? null : byPair.get(`${x}|${y}`) ?? null);

  // 定稿: 下三角矩阵, 上三角纯空白 (宫神星式), 固定大格 42px (密则38)
  const gs = dense ? 38 : 42
  const symFs = 17
  const numFs = 10

  return (
    <div className={bare ? '' : 'rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3'}>
      <table className="mx-auto border-separate" style={{ borderSpacing: 3, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: gs }} />
          {cols.map((c) => <col key={c.name} style={{ width: gs }} />)}
        </colgroup>
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c.name} className="p-0" style={{ height: gs }}>
                <button
                  onClick={() => onPick?.(selected === c.name ? null : c.name)}
                  className={`w-full rounded-[6px] text-[15px] leading-none transition-colors ${
                    selected === c.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  }`}
                  title={zhMode ? c.zh : c.name}
                >
                  {c.symbol}{c.retrograde && <sup style={{ fontSize: 8 }} className="text-[#e8a08a]">R</sup>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((row, ri) => (
            <tr key={row.name}>
              <td className="p-0" style={{ height: gs }}>
                <button
                  onClick={() => onPick?.(selected === row.name ? null : row.name)}
                  className={`w-full rounded-[6px] text-[15px] leading-none transition-colors ${
                    selected === row.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  }`}
                  title={zhMode ? row.zh : row.name}
                >
                  {row.symbol}{row.retrograde && <sup style={{ fontSize: 8 }} className="text-[#e8a08a]">R</sup>}
                </button>
              </td>
              {cols.map((col, ci) => {
                // 上三角/对角: 纯空白, 什么都不画 (不乱的关键)
                if (ci >= ri) return <td key={col.name} style={{ height: '10px' }} />;
                const a = byPair.get(`${row.name}|${col.name}`);
                if (!a) return <td key={col.name} style={{ height: gs }} />;
                const color = ASPECT_COLOR[a.type] ?? '#9aa3b5';
                return (
                  <td key={col.name} className="p-0" style={{ height: gs }}
                    title={`${row.symbol} ${col.symbol} ${a.typeZh} ±${a.orb.toFixed(1)}°`}>
                    <div className="relative flex h-full w-full items-center justify-center rounded-[6px] leading-none"
                      style={{ background: `${color}33`, color }}>
                      <span style={{ fontSize: symFs }}>{a.symbol}</span>
                      <span className="absolute inset-x-0 bottom-[7%] text-center" style={{ fontSize: numFs, letterSpacing: '-0.2px' }}>
                        {a.orb.toFixed(1)}{a.applying === true ? 'A' : a.applying === false ? 'S' : ''}
                      </span>
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
