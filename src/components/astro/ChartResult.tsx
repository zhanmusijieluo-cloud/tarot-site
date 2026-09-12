'use client';

// ============================================================
// 本命盘结果展示 — 宫神星式信息架构 (暗金皮肤)
// 布局: [3D星盘 + Big Three一行] | [行星竖列(点击联动)]
//       相位区 [列表|网格] → 互溶接纳 → 尾注
// ============================================================
import { useState } from 'react';
import { useI18n } from '@/i18n';
import ChartWheel, { type VChart, type VPlanet } from '@/components/astro/ChartWheel';
import AspectGrid from '@/components/astro/AspectGrid';

const DIGNITY_ZH: Record<string, string> = {
  Domicile: '入庙', Exalted: '耀升', Detriment: '失势', Fall: '落陷', Peregrine: '游走',
};
const RECEPTION_KIND_ZH: Record<string, string> = {
  domicile: '庙座', exaltation: '耀升', detriment: '失势', fall: '落陷',
};
const SIGNS_ZH_MINI: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹', Leo: '狮子', Virgo: '处女',
  Libra: '天秤', Scorpio: '天蝎', Scorpius: '天蝎', Sagittarius: '射手', Capricorn: '摩羯',
  Capricornus: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
};

function PlanetRow({ p, selected, onClick }: { p: VPlanet; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-[7px] text-left text-[12px] transition-colors last:border-0 ${
        selected ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.03]'
      }`}
    >
      <span className={`w-6 shrink-0 text-center text-[14px] ${selected ? 'text-accent' : 'text-accent/75'}`}>
        {p.symbol}{p.retrograde && <sup className="text-[8px] text-[#e8a08a]">R</sup>}
      </span>
      <span className={`w-[4.2em] shrink-0 truncate ${selected ? 'text-frost' : 'text-frost/80'}`}>{p.zh}</span>
      <span className="flex-1 truncate text-muted">{p.signZh} {p.degInSign.toFixed(1)}°</span>
      <span className="w-8 shrink-0 text-right text-muted/80">{p.house ? `${p.house}宫` : '—'}</span>
      <span className="w-8 shrink-0 text-right text-[10.5px]">
        {p.dignity && p.dignity.state !== 'Peregrine' ? (
          <span className={p.dignity.strength > 0 ? 'text-[#cdb88a]' : 'text-[#e8a08a]'}>
            {DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}
          </span>
        ) : <span className="text-muted/30">—</span>}
      </span>
    </button>
  );
}

export default function ChartResult({ chart, zhMode, aspectMode: modeProp, onAspectMode }: {
  chart: VChart; zhMode: boolean;
  /** 相位区模式受控于页面 URL (ag=grid); 不传则内部自管 */
  aspectMode?: 'list' | 'grid';
  onAspectMode?: (m: 'list' | 'grid') => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [modeInner, setModeInner] = useState<'list' | 'grid'>('list');
  const aspectMode = modeProp ?? modeInner;
  const setAspectMode = onAspectMode ?? setModeInner;
  const zhOf = (name: string) => chart.planets.find((p) => p.name === name)?.zh ?? name;

  // 接纳一览归并: 互溶对只列一次
  const recepLines: string[] = [];
  {
    const seen = new Set<string>();
    for (const r of chart.receptions) {
      const key = [r.a, r.b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const kind = RECEPTION_KIND_ZH[r.kind] ?? r.kind;
      const sz = (s: string) => SIGNS_ZH_MINI[s] ?? s;
      if (r.mutual) {
        const rev = chart.receptions.find((x) => x.a === r.b && x.b === r.a);
        recepLines.push(zhMode
          ? `⇄ ${zhOf(r.a)} 与 ${zhOf(r.b)} 互溶（互居对方${kind}之座 · ${sz(r.bySign)}/${sz(rev?.bySign ?? '')}）`
          : `⇄ ${r.a} ↔ ${r.b} mutual reception`);
      } else {
        recepLines.push(zhMode
          ? `↦ ${zhOf(r.b)} 接纳 ${zhOf(r.a)}（居其${kind} · ${sz(r.bySign)}）`
          : `↦ ${r.a} received by ${r.b} (${r.kind} · ${sz(r.bySign)})`);
      }
    }
  }

  const angles = [chart.angles.ascendant, chart.angles.midheaven].filter(Boolean) as VPlanet[];
  const sun = chart.planets.find((p) => p.name === 'Sun');
  const moon = chart.planets.find((p) => p.name === 'Moon');

  return (
    <div className="space-y-5">
      {/* 精度声明(有则必显, 不许悄悄换) */}
      {chart.warnings.length > 0 && (
        <div className="space-y-1.5">
          {chart.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2 text-center text-[11px] leading-relaxed text-[#e8a08a]">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* 主区: 盘 + 行星列 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_268px]">
        <div>
          <ChartWheel chart={chart} zhMode={zhMode} selected={selected} onSelect={setSelected} />
          {/* Big Three 压成一行 (学宫神星: 盘下注脚, 不占卡片) */}
          {chart.timeKnown || sun ? (
            <p className="mt-2.5 text-center text-[12px] tracking-[0.06em] text-muted">
              {sun && <span className="mx-2"><span className="text-accent/80">☉</span> {zhMode ? `${sun.signZh} ${sun.degInSign.toFixed(1)}°` : `${sun.sign} ${sun.degInSign.toFixed(1)}°`}</span>}
              {moon && <span className="mx-2"><span className="text-accent/80">☽</span> {zhMode ? `${moon.signZh} ${moon.degInSign.toFixed(1)}°` : `${moon.sign} ${moon.degInSign.toFixed(1)}°`}</span>}
              {chart.angles.ascendant
                ? <span className="mx-2"><span className="text-accent/80">ASC</span> {zhMode ? `${chart.angles.ascendant.signZh} ${chart.angles.ascendant.degInSign.toFixed(1)}°` : `${chart.angles.ascendant.sign} ${chart.angles.ascendant.degInSign.toFixed(1)}°`}</span>
                : <span className="mx-2 text-muted/50">ASC — {t('astro.res.noTime')}</span>}
            </p>
          ) : null}
        </div>

        {/* 行星竖列 (点击 = 盘上高亮, 双向联动) */}
        <aside className="self-start overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20">
          <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.25em] text-muted uppercase">
            {t('astro.res.planet')} · {chart.planets.length}
          </p>
          <div className="max-h-[560px] overflow-y-auto">
            {chart.planets.map((p) => (
              <PlanetRow key={p.name} p={p} selected={selected === p.name} onClick={() => setSelected(selected === p.name ? null : p.name)} />
            ))}
            {angles.map((p) => (
              <div key={p.name} className="flex w-full items-center gap-2 border-b border-white/[0.04] px-3 py-[7px] text-[12px] last:border-0">
                <span className="w-6 shrink-0 text-center text-[12px] text-frost/60">{p.symbol}</span>
                <span className="w-[4.2em] shrink-0 truncate text-frost/70">{p.zh}</span>
                <span className="flex-1 truncate text-muted">{p.signZh} {p.degInSign.toFixed(1)}°</span>
                <span className="w-8 shrink-0 text-right text-muted/80">{p.house ? `${p.house}宫` : '—'}</span>
                <span className="w-8" />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* 相位区: 列表 / 网格 切换 */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.res.aspects')}</p>
          <div className="flex overflow-hidden rounded-full border border-white/[0.1] text-[10.5px]">
            {(['list', 'grid'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAspectMode(m)}
                className={`px-3.5 py-1 tracking-[0.15em] transition-colors ${aspectMode === m ? 'bg-accent/[0.12] text-accent' : 'text-muted hover:text-frost'}`}
              >
                {m === 'list' ? t('astro.res.modeList') : t('astro.res.modeGrid')}
              </button>
            ))}
          </div>
        </div>
        {aspectMode === 'grid' ? (
          <AspectGrid chart={chart} zhMode={zhMode} selected={selected} onPick={setSelected} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...chart.aspects].sort((x, y) => x.orb - y.orb).slice(0, 14).map((a, i) => (
              <span key={i} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-muted">
                {a.symbol} {zhMode ? `${zhOf(a.a)}–${zhOf(a.b)}` : `${a.a}–${a.b}`}{' '}
                <span className="text-accent/70">{a.orb.toFixed(1)}°</span>
                {a.applying === true && <span className="ml-1 text-[#8aa8d8]">→</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 互溶 · 接纳 */}
      {recepLines.length > 0 && (
        <div>
          <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.res.reception')}</p>
          <div className="space-y-1.5">
            {recepLines.map((l, i) => (
              <p key={i} className="text-[12.5px] text-muted">{l}</p>
            ))}
          </div>
        </div>
      )}

      <p className="pt-1 text-center text-[11px] tracking-[0.15em] text-muted/60">
        {t('astro.res.nextHint')}
      </p>
    </div>
  );
}
