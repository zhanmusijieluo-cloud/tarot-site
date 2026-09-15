'use client';

// ============================================================
// 合盘视图 (爸爸体系 16 盘): 比较盘A/B · 组合盘 · 马盘A/B · 时空盘 ·
//   组合三限/次限 · 马盘A/B三限/次限 · 时空三限/次限 · 本命盘A/B
// 首批落地: 比较盘A / 比较盘B / 本命盘A / 本命盘B; 其余按序开发
// 比较盘: 内环=主盘方, 外环=档案方; 弦=A×B 跨盘相位 (·A/·B 端)
// ============================================================
import React from 'react';
import ChartWheel, { type VChart, type VPlanet } from '@/components/astro/ChartWheel';
import { ASPECT_COLOR } from '@/components/astro/AspectGrid';
import type { ChartAspect } from '@/lib/astro/chart';

export interface SynData {
  a: VChart;
  b: VChart;
  crossAspects: ChartAspect[];
  composite: VChart;
  davisonChart: VChart;
  marksA: VChart;
  marksB: VChart;
  marksAS: VChart;
  marksAT: VChart;
  marksBS: VChart;
  marksBT: VChart;
  davS: VChart;
  davT: VChart;
  compS: VChart;
  compT: VChart;
  warnings: string[];
}

const TABS: [string, string, string][] = [
  ['compA', '比较盘A', 'Synastry A'],
  ['compB', '比较盘B', 'Synastry B'],
  ['composite', '组合盘', 'Composite'],
  ['marksA', '马盘A', 'Marks A'],
  ['marksB', '马盘B', 'Marks B'],
  ['davison', '时空盘', 'Davison'],
  ['compT', '组合三限', 'Comp. Tertiary'],
  ['compS', '组合次限', 'Comp. Secondary'],
  ['marksAT', '马盘A三限', 'Marks A Tertiary'],
  ['marksBT', '马盘B三限', 'Marks B Tertiary'],
  ['marksAS', '马盘A次限', 'Marks A Secondary'],
  ['marksBS', '马盘B次限', 'Marks B Secondary'],
  ['davT', '时空三限', 'Davison Tertiary'],
  ['davS', '时空次限', 'Davison Secondary'],
  ['natalA', '本命盘A', 'Natal A'],
  ['natalB', '本命盘B', 'Natal B'],
];
const SINGLE_TABS = ['natalA', 'natalB', 'composite', 'davison', 'marksA', 'marksB', 'compS', 'compT', 'marksAS', 'marksAT', 'marksBS', 'marksBT', 'davS', 'davT'];

const IMP: Record<string, number> = { Sun: 70, Moon: 68, Mercury: 66, Venus: 64, Mars: 62, Jupiter: 60, Saturn: 58, Uranus: 30, Neptune: 30, Pluto: 30, ASC: 15, DSC: 14, MC: 13, IC: 12 };
const ASPECT_ORDER: Record<string, number> = { conjunction: 0, sextile: 1, square: 2, trine: 3, opposition: 4, quincunx: 5 };
const AX_SYM: Record<string, string> = { ASC: 'ASC', DSC: 'DSC', MC: 'MC', IC: 'IC' };
const nmS = (s: string) => s.replace(/·[AB]$/, '');
const pad = (x: number) => String(x).padStart(2, '0');
const fmtDate = (c: VChart) => `${c.input.year}-${pad(c.input.month)}-${pad(c.input.day)} ${pad(c.input.hour)}:${pad(c.input.minute)}`;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20">
      <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">{title}</p>
      {children}
    </section>
  );
}

function ptsOf(c: VChart): Record<string, number> {
  const m: Record<string, number> = {};
  c.planets.forEach((p) => { m[p.name] = p.longitude; });
  if (c.angles.ascendant) { m.ASC = c.angles.ascendant.longitude; m.DSC = (c.angles.ascendant.longitude + 180) % 360; }
  if (c.angles.midheaven) { m.MC = c.angles.midheaven.longitude; m.IC = (c.angles.midheaven.longitude + 180) % 360; }
  return m;
}

/** 合盘相位表 (A×B) */
function CrossTable({ cross, a, b, zhMode, title }: { cross: ChartAspect[]; a: VChart; b: VChart; zhMode: boolean; title: string }) {
  const rows = [...cross].sort((x, y) => (IMP[nmS(y.a)] ?? 0) - (IMP[nmS(x.a)] ?? 0) || (ASPECT_ORDER[x.type] ?? 9) - (ASPECT_ORDER[y.type] ?? 9) || x.orb - y.orb);
  const symEnd = (end: string) => {
    const bare = nmS(end);
    const c = end.endsWith('·A') ? a : b;
    return c.planets.find((p) => p.name === bare)?.symbol ?? AX_SYM[bare] ?? bare;
  };
  const nameEnd = (end: string) => {
    const bare = nmS(end);
    const c = end.endsWith('·A') ? a : b;
    return c.planets.find((p) => p.name === bare)?.zh ?? AX_SYM[bare] ?? bare;
  };
  return (
    <Panel title={`${title} — ${rows.length}`}>
      <ul className="grid grid-cols-1 gap-x-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((x, i) => (
          // 爸爸定稿格式: 月亮△冥王 59.6° 入0.4° —— 双方符号夹相位符, 实际夹角在前, 出/入相+偏差在后
          <li key={i} className="flex items-center gap-1 border-b border-white/[0.04] px-3 py-[5.5px] text-[12px] last:border-0">
            <span className="w-6 text-center text-[13px] leading-none text-frost/90" title={nameEnd(x.a)}>{symEnd(x.a)}</span>
            <span className="text-[9px] text-muted/45">{x.a.endsWith('·A') ? 'A' : 'B'}</span>
            <span className="w-5 text-center text-[13px] leading-none" style={{ color: ASPECT_COLOR[x.type] ?? '#9aa3b5' }}>{x.symbol}</span>
            <span className="w-6 text-center text-[13px] leading-none text-frost/90" title={nameEnd(x.b)}>{symEnd(x.b)}</span>
            <span className="text-[9px] text-muted/45">{x.b.endsWith('·A') ? 'A' : 'B'}</span>
            <span className="shrink-0 tabular-nums text-[12px] text-frost/90">{x.actualAngle !== undefined ? `${x.actualAngle.toFixed(1)}°` : ''}</span>
            <span className="shrink-0 tabular-nums text-[11px]" style={{ color: x.applying === true ? undefined : 'var(--color-muted, #9aa3b5)' }}>
              {x.applying === true ? (zhMode ? '入' : 'A') : x.applying === false ? (zhMode ? '出' : 'S') : ''}{x.orb.toFixed(1)}°
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-3 text-[12px] text-muted/60">{zhMode ? '无容许度内相位' : 'No aspects'}</li>}
      </ul>
    </Panel>
  );
}

export default function SynastryResult({ syn, zhMode, tab, onTab, aLabel, bLabel, onExit, cornerActions }: {
  syn: SynData; zhMode: boolean;
  tab: string; onTab: (t: string) => void;
  aLabel: string; bLabel: string;
  onExit: () => void;
  cornerActions?: React.ReactNode;
}) {
  const a = syn.a, b = syn.b;
  const cur = TABS.some((x) => x[0] === tab) ? tab : 'compA';

  // 双方卡 (合盘页左上; 不放本命资料卡) — 内/外标注随比较盘A/B切换 (爸爸: 对齐行业惯例, A=档案在内)
  const aIn = cur === 'compB';
  const duoCard = (
    <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
      <div className="w-full rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="mb-1.5 font-display text-[13px] tracking-[0.1em] text-accent">{zhMode ? '合盘' : 'Synastry'}</p>
        <p className="truncate text-[11.5px] text-frost/85"><span className="mr-1 text-[9.5px] text-muted/60">A·{aIn ? '内' : '外'}</span>{aLabel} — {fmtDate(a)}</p>
        <p className="truncate text-[11.5px] text-frost/85"><span className="mr-1 text-[9.5px] text-muted/60">B·{aIn ? '外' : '内'}</span>{bLabel} — {fmtDate(b)}</p>
      </div>
      {cornerActions}
    </div>
  );

  const inner = cur === 'compA' ? b : a;   // 内环 (行业惯例对齐: 比较盘A=档案方在内; 爸爸)
  const outer = cur === 'compA' ? a : b;

  return (
    <div className="space-y-4">
      {/* 盘种 Tab 条 (爸爸定序: 比较A,比较B,组合,马A,马B,时空,组合三限,组合次限,马A三限,马B三限,马A次限,马B次限,时空三限,时空次限,本命A,本命B) */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={onExit}
          className="mr-1 rounded-full border border-white/[0.14] px-3.5 py-1.5 text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          ← {zhMode ? '退出合盘' : 'Exit'}
        </button>
        {TABS.map(([k, zh, en]) => (
          <button
            key={k}
            onClick={() => onTab(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] tracking-[0.05em] transition-colors ${cur === k ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
          >
            {zhMode ? zh : en}
          </button>
        ))}
      </div>

      {syn.warnings.length > 0 && (
        <div className="space-y-1.5">
          {syn.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2 text-center text-[11px] text-[#e8a08a]">{w}</p>
          ))}
        </div>
      )}

      {(cur === 'compA' || cur === 'compB') && (() => {
        // 双环: 内=主视角方行星, 外=另一方; 弦端名映射为环名 ·in/·out (爸爸: 点外环不连带内环)
        // 行业惯例对齐 (爸爸): 比较盘A = 档案方在内环, 主盘在外环; 比较盘B 反之
        const innerC = inner;
        const outerC = outer;
        const mapEnd = (e: string) => {
          const isA = e.endsWith('·A');
          const bare = e.replace(/·[AB]$/, '');
          const isInner = isA ? cur === 'compB' : cur === 'compA';
          return bare + (isInner ? '·in' : '·out');
        };
        const crossMapped = syn.crossAspects.map((x) => ({ ...x, a: mapEnd(x.a), b: mapEnd(x.b) }));
        const viewChart: VChart = { ...outerC, planets: outerC.planets, aspects: crossMapped as unknown as VChart['aspects'], receptions: [], extraPoints: ptsOf(innerC) };
        return (
          <>
            <ChartWheel
              chart={viewChart}
              zhMode={zhMode}
              dualRing={{ inner: inner.planets, outer: outer.planets }}
              cornerSlot={duoCard}
            />
            <CrossTable cross={syn.crossAspects} a={a} b={b} zhMode={zhMode} title={zhMode ? '比较相位 (A × B)' : 'Cross aspects (A × B)'} />
          </>
        );
      })()}

      {SINGLE_TABS.includes(cur) && (() => {
        const chartMap: Record<string, VChart> = {
          natalA: a, natalB: b,
          composite: syn.composite, davison: syn.davisonChart,
          marksA: syn.marksA, marksB: syn.marksB,
          compS: syn.compS, compT: syn.compT,
          marksAS: syn.marksAS, marksAT: syn.marksAT, marksBS: syn.marksBS, marksBT: syn.marksBT,
          davS: syn.davS, davT: syn.davT,
        };
        const c = chartMap[cur] as VChart;
        const tabDef = TABS.find((x) => x[0] === cur)!;
        const title = zhMode ? tabDef[1] : tabDef[2];
        const SUBZH: Record<string, string> = {
          natalA: aLabel, natalB: bLabel,
          composite: `${aLabel} × ${bLabel} · 对应天体中点`,
          davison: `${aLabel} × ${bLabel} · 时间地点中点`,
          marksA: `${aLabel}对${bLabel} · 心理盘 (时间×地点)`,
          marksB: `${bLabel}对${aLabel} · 心理盘 (时间×地点)`,
          compS: `双方次限推运的中点 · 当前`, compT: `双方三限推运的中点 · 当前`,
          marksAS: `马盘A的次限推运 · 当前`, marksAT: `马盘A的三限推运 · 当前`,
          marksBS: `马盘B的次限推运 · 当前`, marksBT: `马盘B的三限推运 · 当前`,
          davS: `时空盘的次限推运 · 当前`, davT: `时空盘的三限推运 · 当前`,
        };
        const SUBEN: Record<string, string> = {
          natalA: aLabel, natalB: bLabel,
          composite: `${aLabel} × ${bLabel} · midpoints`, davison: 'Time & place midpoint',
          marksA: `${aLabel} on ${bLabel}`, marksB: `${bLabel} on ${aLabel}`,
          compS: 'Composite secondary · now', compT: 'Composite tertiary · now',
          marksAS: 'Marks A secondary · now', marksAT: 'Marks A tertiary · now',
          marksBS: 'Marks B secondary · now', marksBT: 'Marks B tertiary · now',
          davS: 'Davison secondary · now', davT: 'Davison tertiary · now',
        };
        const sub = zhMode ? (SUBZH[cur] ?? '') : (SUBEN[cur] ?? '');
        const aspTitle = `${title}${zhMode ? '相位' : ' aspects'}`;
        const asp = [...(c.aspects ?? [])].sort((x, y) => (IMP[nmS(y.a)] ?? 0) - (IMP[nmS(x.a)] ?? 0) || (ASPECT_ORDER[x.type] ?? 9) - (ASPECT_ORDER[y.type] ?? 9) || x.orb - y.orb);
        const card = (
          <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
            <div className="w-full rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <p className="mb-1.5 font-display text-[13px] tracking-[0.1em] text-accent">{title}</p>
              <p className="truncate text-[11.5px] text-frost/85">{sub}</p>
              <p className="truncate text-[11.5px] text-muted">{fmtDate(c)} · {c.input.city}</p>
            </div>
            {cornerActions}
          </div>
        );
        return (
          <>
            <ChartWheel chart={c} zhMode={zhMode} cornerSlot={card} />
            <Panel title={`${aspTitle} — ${asp.length}`}>
              <ul className="grid grid-cols-1 gap-x-5 md:grid-cols-2 xl:grid-cols-3">
                {asp.map((x, i) => (
                  // 爸爸定稿: 度数紧跟符号, 不用 ml-auto 推远
                  <li key={i} className="flex items-center gap-1 border-b border-white/[0.04] px-3 py-[5.5px] text-[12px] last:border-0">
                    <span className="w-6 text-center text-[13px] leading-none text-frost/90">{c.planets.find((p) => p.name === x.a)?.symbol ?? x.a}</span>
                    <span className="w-5 text-center text-[13px] leading-none" style={{ color: ASPECT_COLOR[x.type] ?? '#9aa3b5' }}>{x.symbol}</span>
                    <span className="w-6 text-center text-[13px] leading-none text-frost/90">{c.planets.find((p) => p.name === x.b)?.symbol ?? x.b}</span>
                    <span className="ml-0.5 shrink-0 tabular-nums text-[11px] text-muted">±{x.orb.toFixed(1)}°</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        );
      })()}

    </div>
  );
}
