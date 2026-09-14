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
const TODO_NOTE: Record<string, string> = {
  composite: '组合盘 (Composite): 双方对应天体黄经取中点; 下批开发',
  marksA: '马盘A (Marks): A 对 B 的心理盘; 算法核对后开发',
  marksB: '马盘B (Marks): B 对 A 的心理盘; 算法核对后开发',
  davison: '时空盘 (Davison): 时间中点 + 地点中点重排真实星空; 下批开发',
  compT: '组合三限 (组合盘套三限推运); 随组合盘开发',
  compS: '组合次限 (组合盘套次限推运); 随组合盘开发',
  marksAT: '马盘A三限; 随马盘开发',
  marksBT: '马盘B三限; 随马盘开发',
  marksAS: '马盘A次限; 随马盘开发',
  marksBS: '马盘B次限; 随马盘开发',
  davT: '时空三限; 随时空盘开发',
  davS: '时空次限; 随时空盘开发',
};

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
          <li key={i} className="flex items-center gap-1.5 border-b border-white/[0.04] px-3 py-[5.5px] text-[12px] last:border-0">
            <span className="w-6 text-center text-[13px] leading-none text-frost/90" title={nameEnd(x.a)}>{symEnd(x.a)}</span>
            <span className="text-[9px] text-muted/45">{x.a.endsWith('·A') ? 'A' : 'B'}</span>
            <span className="w-5 text-center text-[13px] leading-none" style={{ color: ASPECT_COLOR[x.type] ?? '#9aa3b5' }}>{x.symbol}</span>
            <span className="w-6 text-center text-[13px] leading-none text-frost/90" title={nameEnd(x.b)}>{symEnd(x.b)}</span>
            <span className="text-[9px] text-muted/45">{x.b.endsWith('·A') ? 'A' : 'B'}</span>
            <span className="ml-auto tabular-nums text-[11px] text-muted">
              {x.orb.toFixed(1)}°
              {x.actualAngle !== undefined && <span className="ml-1.5 text-[9.5px] text-muted/55">{x.actualAngle.toFixed(1)}°</span>}
              {x.applying === true && <span className="ml-1 text-[9px] text-accent/55">{zhMode ? '入' : 'A'}</span>}
              {x.applying === false && <span className="ml-1 text-[9px] text-muted/55">{zhMode ? '出' : 'S'}</span>}
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

  // 双方卡 (合盘页左上; 不放本命资料卡)
  const duoCard = (
    <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
      <div className="w-full rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="mb-1.5 font-display text-[13px] tracking-[0.1em] text-accent">{zhMode ? '合盘' : 'Synastry'}</p>
        <p className="truncate text-[11.5px] text-frost/85"><span className="mr-1 text-[9.5px] text-muted/60">A·内</span>{aLabel} — {fmtDate(a)}</p>
        <p className="truncate text-[11.5px] text-frost/85"><span className="mr-1 text-[9.5px] text-muted/60">B·外</span>{bLabel} — {fmtDate(b)}</p>
      </div>
      {cornerActions}
    </div>
  );

  const inner = cur === 'compB' ? b : a;   // 内环 (compA: A 内; compB: B 内)
  const outer = cur === 'compB' ? a : b;

  return (
    <div className="space-y-4">
      {/* 盘种 Tab 条 (爸爸定序: 比较A,比较B,组合,马A,马B,时空,组合三限,组合次限,马A三限,马B三限,马A次限,马B次限,时空三限,时空次限,本命A,本命B) */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={onExit}
          className="mr-1 rounded-full border border-white/[0.14] px-3 py-1 text-[10.5px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          ← {zhMode ? '退出合盘' : 'Exit'}
        </button>
        {TABS.map(([k, zh, en]) => (
          <button
            key={k}
            onClick={() => onTab(k)}
            className={`rounded-full border px-2.5 py-1 text-[10.5px] tracking-[0.04em] transition-colors ${cur === k ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
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
        // 双环: 内=主视角方行星, 外=另一方; 弦=A×B (·A→A 表, ·B→盘上 B; 借 extraPoints 与 chart.planets 分流)
        const viewChart: VChart = { ...b, planets: b.planets, aspects: syn.crossAspects as unknown as VChart['aspects'], receptions: [], extraPoints: ptsOf(a) };
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

      {(cur === 'natalA' || cur === 'natalB') && (() => {
        const c = cur === 'natalA' ? a : b;
        const label = cur === 'natalA' ? aLabel : bLabel;
        const asp = [...(c.aspects ?? [])].sort((x, y) => (IMP[nmS(y.a)] ?? 0) - (IMP[nmS(x.a)] ?? 0) || (ASPECT_ORDER[x.type] ?? 9) - (ASPECT_ORDER[y.type] ?? 9) || x.orb - y.orb);
        const card = (
          <div className="pointer-events-auto flex w-[248px] flex-col gap-1.5">
            <div className="w-full rounded-2xl border border-white/[0.1] bg-[#0a0e19]/90 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <p className="mb-1.5 font-display text-[13px] tracking-[0.1em] text-accent">{zhMode ? '本命盘' : 'Natal'} {cur === 'natalA' ? 'A' : 'B'}</p>
              <p className="truncate text-[11.5px] text-frost/85">{label}</p>
              <p className="truncate text-[11.5px] text-muted">{fmtDate(c)} · {c.input.city}</p>
            </div>
            {cornerActions}
          </div>
        );
        return (
          <>
            <ChartWheel chart={c} zhMode={zhMode} cornerSlot={card} />
            <Panel title={`${zhMode ? '本命相位' : 'Natal aspects'} — ${asp.length}`}>
              <ul className="grid grid-cols-1 gap-x-5 md:grid-cols-2 xl:grid-cols-3">
                {asp.map((x, i) => (
                  <li key={i} className="flex items-center gap-1.5 border-b border-white/[0.04] px-3 py-[5.5px] text-[12px] last:border-0">
                    <span className="w-6 text-center text-[13px] leading-none text-frost/90">{c.planets.find((p) => p.name === x.a)?.symbol ?? x.a}</span>
                    <span className="w-5 text-center text-[13px] leading-none" style={{ color: ASPECT_COLOR[x.type] ?? '#9aa3b5' }}>{x.symbol}</span>
                    <span className="w-6 text-center text-[13px] leading-none text-frost/90">{c.planets.find((p) => p.name === x.b)?.symbol ?? x.b}</span>
                    <span className="ml-auto tabular-nums text-[11px] text-muted">{x.orb.toFixed(1)}°</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        );
      })()}

      {!['compA', 'compB', 'natalA', 'natalB'].includes(cur) && (
        <Panel title={TABS.find((x) => x[0] === cur)![zhMode ? 1 : 2]}>
          <div className="px-3 py-16 text-center">
            <p className="text-[13px] text-muted/80">{zhMode ? TODO_NOTE[cur] ?? '开发中' : 'In development'}</p>
          </div>
        </Panel>
      )}
    </div>
  );
}
