'use client';

// ============================================================
// 排盘设置面板 (设置即盘面身份: 改动 → URL → 重排盘)
// 天体分组 / 相位类型(14种) / 容许度(滑杆) — 宫制切换在页面顶栏已有
// ============================================================

import { useState } from 'react';
import { useI18n } from '@/i18n';
import type { BodyGroup, CastSettings } from '@/lib/astro/chart';
import { DEFAULT_ORBS } from '@/lib/astro/chart-url';

const GROUPS: { key: BodyGroup; zh: string; en: string; hint: string }[] = [
  { key: 'asteroids', zh: '小行星', en: 'Asteroids', hint: '谷神·智神·婚神·灶神' },
  { key: 'chiron', zh: '凯龙星', en: 'Chiron', hint: '⚷ 疗愈者' },
  { key: 'nodes', zh: '月亮交点', en: 'Lunar Nodes', hint: '☊☋ 南北交点(真)' },
  { key: 'lilith', zh: '莉莉丝', en: 'Lilith', hint: '⚸ 暗月(平均)' },
  { key: 'lots', zh: '阿拉伯点位', en: 'Arabic Lots', hint: '⊕福点 ⊖精神点' },
];

// 五大默认恒开; 次要可勾选
const MAJOR = [
  { key: 'conjunction', sym: '☌', zh: '合', en: 'Conjunction', deg: '0°' },
  { key: 'opposition', sym: '☍', zh: '冲', en: 'Opposition', deg: '180°' },
  { key: 'trine', sym: '△', zh: '三合', en: 'Trine', deg: '120°' },
  { key: 'square', sym: '□', zh: '刑', en: 'Square', deg: '90°' },
  { key: 'sextile', sym: '⚹', zh: '六合', en: 'Sextile', deg: '60°' },
];
const MINOR = [
  { key: 'quincunx', sym: '⚻', zh: '梅花', en: 'Quincunx', deg: '150°' },
  { key: 'semi-sextile', sym: '⚶', zh: '半六合', en: 'Semi-sextile', deg: '30°' },
  { key: 'semi-square', sym: '∠', zh: '半刑', en: 'Semi-square', deg: '45°' },
  { key: 'sesquiquadrate', sym: '⚼', zh: '倍半刑', en: 'Sesquiquadrate', deg: '135°' },
  { key: 'quintile', sym: 'Q', zh: '五分相', en: 'Quintile', deg: '72°' },
  { key: 'biquintile', sym: 'Q²', zh: '倍五分相', en: 'Biquintile', deg: '144°' },
  { key: 'septile', sym: 'S', zh: '七分相', en: 'Septile', deg: '51.4°' },
  { key: 'novile', sym: 'N', zh: '九分相', en: 'Novile', deg: '40°' },
  { key: 'decile', sym: 'Y', zh: '十分相', en: 'Decile', deg: '36°' },
];

export default function ChartSettings({ value, onChange }: {
  value: CastSettings;
  onChange: (s: CastSettings) => void;
}) {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const [open, setOpen] = useState(false);

  const bodies = value.bodies ?? {};
  const aspectTypes = value.aspectTypes ?? MAJOR.map((m) => m.key);
  const orbs = value.orbs ?? {};

  const toggleGroup = (g: BodyGroup) => {
    onChange({ ...value, bodies: { ...bodies, [g]: !bodies[g] } });
  };
  const toggleAspect = (k: string) => {
    const has = aspectTypes.includes(k);
    const next = has ? aspectTypes.filter((x) => x !== k) : [...aspectTypes, k];
    onChange({ ...value, aspectTypes: next });
  };
  const setOrb = (k: string, v: number) => {
    onChange({ ...value, orbs: { ...orbs, [k]: v } });
  };
  const reset = () => onChange({});

  const activeCount =
    Object.values(bodies).filter(Boolean).length +
    Math.max(0, aspectTypes.length - 5) +
    Object.keys(orbs).length;

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-accent/40 hover:text-frost"
      >
        ⚙ {t('astro.set.title')}
        {activeCount > 0 && <span className="rounded-full bg-accent/20 px-1.5 text-[10px] text-accent">{activeCount}</span>}
      </button>

      {/* 抽屉 */}
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative flex h-full w-full max-w-sm flex-col border-l border-white/[0.08] bg-[#0b0e17]/95"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'rise-in 0.35s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <p className="font-display text-sm tracking-[0.2em] text-frost">⚙ {t('astro.set.title')}</p>
              <button onClick={() => setOpen(false)} className="glass-btn px-3 py-1 text-[10px] tracking-[0.2em]">✕</button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* 天体分组 */}
              <section>
                <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.set.bodies')}</p>
                <div className="space-y-1.5">
                  {GROUPS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => toggleGroup(g.key)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        bodies[g.key] ? 'border-accent/45 bg-accent/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <span className="text-[12.5px] text-frost/90">
                        {zhMode ? g.zh : g.en}
                        <span className="ml-2 text-[10px] text-muted/70">{g.hint}</span>
                      </span>
                      <span className={`text-[10px] ${bodies[g.key] ? 'text-accent' : 'text-muted/40'}`}>{bodies[g.key] ? '●' : '○'}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted/60">{t('astro.set.bodiesHint')}</p>
              </section>

              {/* 相位类型 */}
              <section>
                <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.set.aspects')}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MAJOR.map((a) => (
                    <div key={a.key} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                      <span className="w-5 text-center text-[13px] text-accent/80">{a.sym}</span>
                      <span className="flex-1 text-[12px] text-frost/90">{zhMode ? a.zh : a.en}<span className="ml-1 text-[9px] text-muted/60">{a.deg}</span></span>
                      <span className="text-[9px] text-muted/50">{t('astro.set.alwaysOn')}</span>
                    </div>
                  ))}
                </div>
                <p className="mb-1.5 mt-3 text-[10px] tracking-[0.2em] text-muted/70 uppercase">{t('astro.set.minor')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {MINOR.map((a) => {
                    const on = aspectTypes.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        onClick={() => toggleAspect(a.key)}
                        className={`rounded-lg border px-2 py-1.5 text-center transition-colors ${
                          on ? 'border-accent/45 bg-accent/[0.07] text-accent' : 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/20'
                        }`}
                      >
                        <span className="block text-[13px]">{a.sym}</span>
                        <span className="block text-[10px]">{zhMode ? a.zh : a.en}</span>
                        <span className="block text-[8.5px] text-muted/60">{a.deg}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 容许度 */}
              <section>
                <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.set.orbs')}</p>
                <div className="space-y-3">
                  {MAJOR.map((a) => {
                    const v = orbs[a.key] ?? DEFAULT_ORBS[a.key];
                    const changed = orbs[a.key] !== undefined;
                    return (
                      <div key={a.key}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-frost/85">{a.sym} {zhMode ? a.zh : a.en}</span>
                          <span className={changed ? 'text-accent' : 'text-muted/60'}>
                            {v.toFixed(1)}°{changed && (
                              <button onClick={() => { const n = { ...orbs }; delete n[a.key]; onChange({ ...value, orbs: n }); }} className="ml-1.5 underline decoration-dotted">↺</button>
                            )}
                          </span>
                        </div>
                        <input
                          type="range" min={0.5} max={15} step={0.5} value={v}
                          onChange={(e) => setOrb(a.key, Number(e.target.value))}
                          className="w-full accent-[var(--accent,#c9a86c)]"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted/60">{t('astro.set.orbsHint')}</p>
              </section>
            </div>

            <div className="border-t border-white/[0.06] px-5 py-4">
              <button onClick={reset} className="glass-btn w-full py-2.5 text-[11px] tracking-[0.25em]">
                {t('astro.set.reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
