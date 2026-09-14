'use client';

// ============================================================
// 动态盘结果 (次限盘) — 爸爸定稿方案:
//   进入 = 单环次限盘; (下一步) 按钮/双击 → 双环对比;
//   盘下方 = 推运盘 × 本命 相位表
// 数据: POST /api/astro/chart/dynamic { type:'progression' }
// 注意: 单环次限盘 = 次限行星位置 + 本命宫位圈/四轴 (推运盘标准画法)
// ============================================================
import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import ChartWheel, { type VChart, type VPlanet } from '@/components/astro/ChartWheel';
import NatalCard from '@/components/astro/NatalCard';
import { ASPECT_COLOR } from '@/components/astro/AspectGrid';
import type { DynamicChart } from '@/lib/astro/dynamic';

const IMP: Record<string, number> = {
  Sun: 70, Moon: 68, Mercury: 66, Venus: 64, Mars: 62, Jupiter: 60, Saturn: 58,
  Uranus: 30, Neptune: 30, Pluto: 30, ASC: 15, DSC: 14, MC: 13, IC: 12,
};
const ASPECT_ORDER: Record<string, number> = { conjunction: 0, sextile: 1, square: 2, trine: 3, opposition: 4, quincunx: 5 };
const AX_ZH: Record<string, string> = { ASC: '上升', DSC: '下降', MC: '天顶', IC: '天底' };

// 盘种文案 (按 dyn.type 切换; 爸爸盘种条: 本命/三限/次限/行运/日返/月返/日弧)
const KIND: Record<string, { zh: string; en: string; note: string; noteEn: string }> = {
  progression: { zh: '次限盘', en: 'Secondary', note: '次限盘: 出生后 1 天 = 1 年 (标准推运法)。行星按本命宫位排布, 四轴/宫位不变。', noteEn: 'Secondary progression: 1 day after birth = 1 year. Planets in natal houses.' },
  tertiary: { zh: '三限盘', en: 'Tertiary', note: '三限盘: 出生后 1 天 = 1 个月 (每年推进 12 天)。行星按本命宫位排布, 四轴/宫位不变。', noteEn: 'Tertiary progression: 1 day after birth = 1 month (12 days per year). Planets in natal houses.' },
  transit: { zh: '行运盘', en: 'Transit', note: '行运盘: 目标日期的实时天象行星, 对照本命宫位与四轴。', noteEn: 'Transit: real-sky planets of the target date against the natal chart.' },
  'solar-return': { zh: '日返盘', en: 'Solar Return', note: '太阳返照盘: 太阳回到本命黄经的时刻重排全盘 (外盘=返照时刻行星)。', noteEn: 'Solar return: chart cast for the moment the Sun returns to its natal longitude.' },
  'lunar-return': { zh: '月返盘', en: 'Lunar Return', note: '月亮返照盘: 月亮回到本命黄经的时刻重排全盘 (约每月一次)。', noteEn: 'Lunar return: chart cast for the moment the Moon returns to its natal longitude.' },
  'solar-arc': { zh: '日弧盘', en: 'Solar Arc', note: '太阳弧盘: 全盘按太阳推运弧统一前移的推运法。', noteEn: 'Solar arc: every point advanced by the Sun\'s progressed arc.' },
};

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 ${className}`}>
      <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">{title}</p>
      {children}
    </section>
  );
}

// 度分: 0.38 → 0°23′ (学宫神星精确到分)
const dmsOrb = (deg: number) => {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
};

export default function DynResult({ dyn, zhMode, target, onDate, cornerActions }: {
  dyn: DynamicChart;
  zhMode: boolean;
  target: { year: number; month: number; day: number };
  onDate: (y: number, m: number, d: number) => void;
  cornerActions?: React.ReactNode;
}) {
  const { t } = useI18n();
  const natal = dyn.natal as unknown as VChart;
  const outer = dyn.outer;
  // 单环/双环 (爸爸: 双击盘面或按钮切换; 双环=内本命+外次限)
  const [dual, setDual] = useState(false);
  const kind = KIND[dyn.type] ?? KIND.progression;

  const nameOf = (raw: string) => raw.replace('·P', '').replace('·T', '').replace('·R', '');
  const symOf = (raw: string) => {
    const n = nameOf(raw);
    if (AX_ZH[n]) return n;
    return natal.planets.find((p) => p.name === n)?.symbol ?? n;
  };
  const zhOf = (raw: string) => {
    const n = nameOf(raw);
    if (AX_ZH[n]) return AX_ZH[n];
    return natal.planets.find((p) => p.name === n)?.zh ?? n;
  };

  // 本命点黄经表 (爸爸: 推运盘中心要有相位线 — 画 推运星→本命位置 的 cross 弦)
  const extraPoints = React.useMemo(() => {
    const m: Record<string, number> = {};
    natal.planets.forEach((p) => { m[p.name] = p.longitude; });
    if (natal.angles.ascendant) { m.ASC = natal.angles.ascendant.longitude; m.DSC = (natal.angles.ascendant.longitude + 180) % 360; }
    if (natal.angles.midheaven) { m.MC = natal.angles.midheaven.longitude; m.IC = (natal.angles.midheaven.longitude + 180) % 360; }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyn]);
  const viewChart: VChart = outer ? {
    ...natal,
    planets: outer.planets as unknown as VPlanet[],
    aspects: dyn.crossAspects as unknown as VChart['aspects'],
    receptions: [],
    extraPoints,
  } : natal;

  const rows = [...dyn.crossAspects].sort((a, b) =>
    (IMP[nameOf(b.a)] ?? 0) - (IMP[nameOf(a.a)] ?? 0) ||
    (ASPECT_ORDER[a.type] ?? 9) - (ASPECT_ORDER[b.type] ?? 9) ||
    a.orb - b.orb);

  const pad = (x: number) => String(x).padStart(2, '0');
  const dateVal = `${outer ? outer.date.year : target.year}-${pad(outer ? outer.date.month : target.month)}-${pad(outer ? outer.date.day : target.day)}`;

  if (!outer) {
    return (
      <div className="space-y-4">
        <p className="py-20 text-center text-[12px] text-muted">{t('astro.form.casting')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dyn.warnings.length > 0 && (
        <div className="space-y-1.5">
          {dyn.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2 text-center text-[11px] leading-relaxed text-[#e8a08a]">{w}</p>
          ))}
        </div>
      )}

      {/* 盘区: 盘(内嵌资料卡+按钮) | 右侧次限信息 */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_236px]">
        <div className="min-w-0">
          <ChartWheel
            chart={viewChart}
            zhMode={zhMode}
            dualRing={dual && outer ? { inner: natal.planets, outer: outer.planets as unknown as VPlanet[] } : undefined}
            onDualToggle={() => setDual((v) => !v)}
            actions={
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDual(false)}
                  className={`rounded-full border px-3 py-1 text-[10.5px] tracking-[0.12em] transition-colors ${!dual ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
                >
                  {zhMode ? '单环' : 'Single'}
                </button>
                <button
                  onClick={() => setDual(true)}
                  title={zhMode ? '本命(内圈) + 次限(外圈); 双击盘面也可切换' : 'Natal inner + progressed outer; double-click to toggle'}
                  className={`rounded-full border px-3 py-1 text-[10.5px] tracking-[0.12em] transition-colors ${dual ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
                >
                  {zhMode ? '双环' : 'Dual'}
                </button>
              </div>
            }
            cornerSlot={
              <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
                <NatalCard chart={natal} zhMode={zhMode} />
                {cornerActions}
              </div>
            }
          />
        </div>
        <div className="space-y-4">
          <Panel title={zhMode ? `${kind.zh}设置` : kind.en}>
            <div className="space-y-2.5 p-3">
              <label className="flex items-center justify-between gap-2 text-[12px] text-frost/85">
                {zhMode ? '目标日期' : 'Date'}
                <input
                  type="date"
                  value={dateVal}
                  min="1900-01-01"
                  max="2100-12-31"
                  onChange={(e) => {
                    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.target.value);
                    if (m) onDate(Number(m[1]), Number(m[2]), Number(m[3]));
                  }}
                  className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[11.5px] text-frost [color-scheme:dark]"
                />
              </label>
              <p className="text-[10.5px] leading-relaxed text-muted/70">
                {zhMode ? kind.note : kind.noteEn}
              </p>
              {outer.solarArc !== undefined && (
                <p className="flex items-center justify-between text-[11.5px] text-frost/85">
                  {zhMode ? '太阳弧' : 'Solar arc'}
                  <span className="tabular-nums text-muted">+{outer.solarArc}°</span>
                </p>
              )}
              <p className="flex items-center justify-between text-[11.5px] text-frost/85">
                {zhMode ? '盘面时间' : 'Chart date'}
                <span className="tabular-nums text-muted">{outer.label}</span>
              </p>
            </div>
          </Panel>
        </div>
      </div>

      {/* 下方: 推运 × 本命 相位表 */}
      <Panel title={`${zhMode ? kind.zh + '相位' : kind.en + ' aspects'} (→ ${zhMode ? '本命' : 'natal'}) — ${rows.length}`}>
        <ul className="grid grid-cols-1 gap-x-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((a, i) => (
            <li key={i} className="flex items-center gap-1.5 border-b border-white/[0.04] px-3 py-[5.5px] text-[12px] last:border-0">
              <span className="w-7 text-center text-[14px] leading-none text-frost/90" title={zhOf(a.a)}>{symOf(a.a)}</span>
              <span className="text-[9px] text-muted/45">{zhMode ? (dual ? '外环' : '推') : (dual ? 'Outer' : 'P')}</span>
              <span className="w-5 text-center text-[13px] leading-none" style={{ color: ASPECT_COLOR[a.type] ?? '#9aa3b5' }} title={a.typeZh}>{a.symbol}</span>
              <span className="w-7 text-center text-[14px] leading-none text-frost/90" title={zhOf(a.b)}>{symOf(a.b)}</span>
              <span className="text-[9px] text-muted/45">{zhMode ? (dual ? '内环' : '本命') : (dual ? 'Inner' : 'N')}</span>
              <span className="ml-auto tabular-nums text-[11px] text-muted">{dmsOrb(a.orb)}</span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-3 py-3 text-[12px] text-muted/60">{zhMode ? '无容许度内相位' : 'No aspects within orb'}</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
