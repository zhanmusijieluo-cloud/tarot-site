'use client';

// ============================================================
// 相位网格表 (宫神星同款下三角矩阵)
// 定稿版: 全矩阵等宽等高正方格 (含空格), 列头严格对位, 无斑马条纹
// 格内: 相位符号 + 偏差°′ + A/S; 颜色按相位性质; 点击行头/列头联动星盘
// 行列 = 行星 + 四轴 (ASC/DSC/MC/IC) — 爸爸: 网格也要有四轴相位 (宫神星同款)
// ============================================================

import type { VAspect, VChart, VPlanet } from '@/components/astro/ChartWheel';

// 相位配色: 红=困难(刑冲) 绿/蓝=和谐(拱/六合) 金=合 紫=梅花
import { ASPECT_HEX } from '@/lib/astro/aspect-colors';
/** 相位配色 (唯一定义在 aspect-colors.ts, 盘线同源) */
export const ASPECT_COLOR = ASPECT_HEX;
const SYM: Record<string, string> = { conjunction: '☌', opposition: '☍', square: '□', trine: '△', sextile: '⚹', quincunx: '⚻' };
/** 星体重要度 (网格/清单同源: 七大→三王→小行星→虚点→四轴; 用于取前10与排序) */
export const ASPECT_IMP: Record<string, number> = {
  Sun: 70, Moon: 65, Mercury: 60, Venus: 55, Mars: 50, Jupiter: 45, Saturn: 40,
  Uranus: 30, Neptune: 25, Pluto: 20, Chiron: 18, Ceres: 12, Pallas: 11, Juno: 10, Vesta: 9,
  'North Node': 8, 'South Node': 8, 'Mean North Node': 8, 'Mean South Node': 8,
  'True North Node': 8, 'True South Node': 8, Lilith: 7, 'Mean Lilith': 7, 'True Lilith': 7,
  'Part of Fortune': 6, 'Part of Spirit': 6, Ascendant: 15, Descendant: 13, Midheaven: 12, IC: 10,
}
/** 与网格同源的"参与点位" = 十大(按重要度)+四轴 (清单据此过滤相位) */
export function aspectMatrixPoints(chart: VChart): string[] {
  const impOf = (x: { name: string }) => ASPECT_IMP[x.name] ?? 0
  const pts = [...[...chart.planets].sort((a, b) => impOf(b) - impOf(a)).slice(0, 10).map((p) => p.name)]
  if (chart.angles.ascendant) pts.push('Ascendant', 'Descendant', 'Midheaven', 'IC')
  return pts
}
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
      <span className="text-muted/50">{zhMode ? 'A=入相 S=出相 · 数字=偏差°′' : 'A=applying S=separating · orb°′'}</span>
    </span>
  );
}

/** 度分制偏差 (宫神星同款: 6.10 → 6°06′) */
export function fmtOrbDms(orb: number): string {
  const d = Math.floor(orb);
  const m = Math.round((orb - d) * 60);
  return m === 60 ? `${d + 1}°` : `${d}°${String(m).padStart(2, '0')}′`;
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
  // 列 = 盘上天体 + 四轴 (宫神星同款: 网格含 ASC/DSC/MC/IC 行列); 数量大时限 14 保证可读
  const axisCols: { name: string; symbol: string; zh: string; retrograde?: boolean }[] = [];
  if (chart.angles.ascendant) {
    axisCols.push({ name: 'Ascendant', symbol: 'ASC', zh: zhMode ? '上升' : 'ASC', retrograde: false });
    axisCols.push({ name: 'Descendant', symbol: 'DSC', zh: zhMode ? '下降' : 'DSC', retrograde: false });
    axisCols.push({ name: 'Midheaven', symbol: 'MC', zh: zhMode ? '中天' : 'MC', retrograde: false });
    axisCols.push({ name: 'IC', symbol: 'IC', zh: zhMode ? '天底' : 'IC', retrograde: false });
  }
  // 星体重要度 (同弹窗: 七大→三王→4轴; 只用于排行列, 相位判据不依赖) — 导出供清单同源
  const IMP = ASPECT_IMP
  const impOf = (x: { name: string }) => IMP[x.name] ?? 0
  // 行星取前10 (重要度), 四轴必在 → 最多14列 (宫神星同款: 盘面可读不爆)
  const cols: (VPlanet | { name: string; symbol: string; zh: string; retrograde?: boolean })[] = [...[...chart.planets].sort((a, b) => impOf(b) - impOf(a)).slice(0, 10), ...axisCols];

  // 相位查表: "a|b" 双向 (aspects 已含四轴相位 — engine 层 AxisBodies)
  const byPair = new Map<string, VAspect>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }

  // 定稿: 下三角矩阵, 上三角纯空白 (宫神星式), 固定大格 42px (密则38)
  const gs = 42 // 固定大格 42px (宫神星同款; 14列×42+间距≈650px 放得下, 不缩)
    const symFs = 17
    const numFs = 10

  // 爸爸定稿: 无顶部行头 — 星体符号放在对角格正中 (与左列行头一一对应); 全格 1px 网格线 (不再"看错行列")
  const GRID = '1px solid rgba(255,255,255,0.07)'

  return (
    <div className={bare ? '' : 'rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3'}>
      <table data-testid="aspect-matrix" className="mx-auto" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: gs }} />
          {cols.map((c) => <col key={c.name} style={{ width: gs }} />)}
        </colgroup>
        <tbody>
          {cols.map((row, ri) => (
            <tr key={row.name}>
              <td className="p-0" style={{ height: gs, border: GRID }}>
                <button
                  onClick={() => onPick?.(selected === row.name ? null : row.name)}
                  className={`flex h-full w-full items-center justify-center rounded-[4px] leading-none transition-colors ${
                    selected === row.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                  } ${row.name === 'Ascendant' || row.name === 'Midheaven' || row.name === 'Descendant' || row.name === 'IC' ? 'text-[10px] tracking-[0.1em]' : 'text-[15px]'}`}
                  title={row.zh}
                >
                  {row.symbol}{row.retrograde && <sup style={{ fontSize: 8 }} className="text-[#e8a08a]">R</sup>}
                </button>
              </td>
              {cols.map((col, ci) => {
                // 对角格: 星体符号居中正立 (爸爸定稿: 无斜线、无角落摆放 — 干净, 与行头列头一一对应)
                if (ci === ri) return (
                  <td key={col.name} className="p-0" style={{ height: gs, border: GRID }}>
                    <button
                      onClick={() => onPick?.(selected === col.name ? null : col.name)}
                      className={`flex h-full w-full items-center justify-center rounded-[4px] leading-none transition-colors ${
                        selected === col.name ? 'bg-accent/20 text-accent' : 'text-frost/70 hover:bg-white/[0.06]'
                      }`}
                      title={col.zh}
                    >
                      <span className={col.name === 'Ascendant' || col.name === 'Midheaven' || col.name === 'Descendant' || col.name === 'IC' ? 'text-[10px] font-medium' : 'text-[15px]'}>
                        {col.symbol}{col.retrograde && <sup style={{ fontSize: 8 }} className="text-[#e8a08a]">R</sup>}
                      </span>
                    </button>
                  </td>
                );
                // 上三角: 不渲染任何格子 (爸爸: 画线的空白三角删掉 — 阶梯形, 不再有一堆空框)
                if (ci > ri) return <td key={col.name} className="p-0" />;
                const a = byPair.get(`${row.name}|${col.name}`);
                if (!a) return <td key={col.name} style={{ height: gs, border: GRID }} />;
                const color = ASPECT_COLOR[a.type] ?? '#9aa3b5';
                return (
                  <td key={col.name} className="p-0" style={{ height: gs, border: GRID }}
                    title={`${row.zh} ${col.zh} ${a.typeZh} ±${fmtOrbDms(a.orb)}`}>
                    <div className="relative flex h-full w-full items-center justify-center leading-none"
                      style={{ background: `${color}33`, color }}>
                      <span style={{ fontSize: symFs }}>{a.symbol}</span>
                      <span className="absolute inset-x-0 bottom-[7%] text-center" style={{ fontSize: numFs, letterSpacing: '-0.2px' }}>
                        {fmtOrbDms(a.orb)}{a.applying === true ? 'A' : a.applying === false ? 'S' : ''}
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
          <span className="ml-auto">{zhMode ? 'A=入相 S=出相 · 数字=偏差°′' : 'A=applying S=separating · orb°′'}</span>
        </div>
      )}
    </div>
  );
}