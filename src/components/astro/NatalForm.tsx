'use client';

// ============================================================
// 本命盘排盘器 (占星板块 A1 骨架)
// 流程: 填生辰 → POST /api/astro/chart → 结构化盘面展示
// 铁律: 盘面数据来自引擎, 本页只展示不修饰; 解读链路(D1/D2)下一里程碑接入
// ============================================================

import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { ALL_CITIES, findCity } from '@/lib/astro/cities';
import ChartWheel, { type VChart } from '@/components/astro/ChartWheel';
import type { HouseSystem } from '@/lib/astro/chart';

// ---- 盘面类型: 与 API 返回对齐, 由 ChartWheel 统一导出 ----

const HOUSE_SYSTEMS: { value: HouseSystem; zh: string }[] = [
  { value: 'placidus', zh: '普拉西德' },
  { value: 'koch', zh: '科赫' },
  { value: 'equal', zh: '等宫' },
  { value: 'whole-sign', zh: '整宫' },
  { value: 'porphyry', zh: '波菲里' },
  { value: 'regiomontanus', zh: '雷吉奥蒙塔努斯' },
  { value: 'campanus', zh: '坎帕努斯' },
];

const DIGNITY_ZH: Record<string, string> = {
  Domicile: '入庙', Exalted: '耀升', Detriment: '失势', Fall: '落陷', Peregrine: '游走',
};

const PLANET_ZH_MINI: Record<string, string> = {
  Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星',
  Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
};

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost ' +
  'outline-none transition-colors placeholder:text-muted/40 focus:border-accent/40';
const labelCls = 'mb-1.5 block text-[10px] tracking-[0.25em] text-muted uppercase';

export default function NatalForm() {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';

  const [year, setYear] = useState('1995');
  const [month, setMonth] = useState('6');
  const [day, setDay] = useState('15');
  const [hour, setHour] = useState('14');
  const [minute, setMinute] = useState('30');
  const [timeKnown, setTimeKnown] = useState(true);
  const [cityId, setCityId] = useState('beijing');
  const [houseSystem, setHouseSystem] = useState<HouseSystem>('placidus');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chart, setChart] = useState<VChart | null>(null);

  const city = useMemo(() => findCity(cityId), [cityId]);

  const cast = async () => {
    setLoading(true); setError(''); setChart(null);
    try {
      const res = await fetch('/api/astro/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth: {
            year: +year, month: +month, day: +day,
            hour: +hour, minute: +minute,
            timezone: city?.tz ?? 8,
            latitude: city?.lat ?? 39.9042,
            longitude: city?.lng ?? 116.4074,
            city: zhMode ? city?.zh : city?.en,
            houseSystem, timeKnown,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('astro.form.failed')); return; }
      setChart(data.chart as VChart);
    } catch {
      setError(t('astro.form.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
      {/* ---- 表单 ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>{t('astro.form.year')}</label>
          <input type="number" inputMode="numeric" value={year} min={1900} max={2100}
            onChange={(e) => setYear(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('astro.form.month')}</label>
          <input type="number" inputMode="numeric" value={month} min={1} max={12}
            onChange={(e) => setMonth(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('astro.form.day')}</label>
          <input type="number" inputMode="numeric" value={day} min={1} max={31}
            onChange={(e) => setDay(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('astro.form.city')}</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls}>
            {ALL_CITIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0b0e17]">
                {zhMode ? c.zh : c.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={timeKnown ? '' : 'pointer-events-none opacity-35'}>
          <label className={labelCls}>{t('astro.form.hour')}</label>
          <input type="number" inputMode="numeric" value={hour} min={0} max={23} disabled={!timeKnown}
            onChange={(e) => setHour(e.target.value)} className={inputCls} />
        </div>
        <div className={timeKnown ? '' : 'pointer-events-none opacity-35'}>
          <label className={labelCls}>{t('astro.form.minute')}</label>
          <input type="number" inputMode="numeric" value={minute} min={0} max={59} disabled={!timeKnown}
            onChange={(e) => setMinute(e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2 flex items-end pb-1">
          <button
            type="button"
            onClick={() => setTimeKnown((v) => !v)}
            className={`rounded-full border px-4 py-2 text-[11px] tracking-[0.15em] transition-colors ${
              !timeKnown
                ? 'border-accent/50 bg-accent/[0.08] text-accent'
                : 'border-white/[0.1] text-muted hover:border-white/25'
            }`}
          >
            {t('astro.form.noTime')}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls}>{t('astro.form.system')}</label>
        <div className="flex flex-wrap gap-2">
          {HOUSE_SYSTEMS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setHouseSystem(s.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${
                houseSystem === s.value
                  ? 'border-accent/50 bg-accent/[0.08] text-accent'
                  : 'border-white/[0.1] text-muted hover:border-white/25'
              }`}
            >
              {zhMode ? s.zh : s.value}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted/70">{t('astro.form.systemHint')}</p>
      </div>

      <button
        type="button"
        onClick={cast}
        disabled={loading || !city}
        className="glass-btn-primary mt-6 w-full py-3.5 text-sm tracking-[0.3em] disabled:opacity-40"
      >
        {loading ? t('astro.form.casting') : t('astro.form.cast')}
      </button>

      {error && (
        <p className="mt-3 text-center text-[12px] text-[#e8a08a]">{error}</p>
      )}

      {/* ---- 盘面结果 ---- */}
      {chart && (
        <div className="mt-8 space-y-6" style={{ animation: 'rise-in 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="hairline-glow mx-auto w-32" />

          {/* 精度声明(有则必显, 不许悄悄换) */}
          {chart.warnings.map((w, i) => (
            <p key={i} className="rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-2.5 text-center text-[11px] leading-relaxed text-[#e8a08a]">
              {w}
            </p>
          ))}

          {/* Big Three */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('astro.res.sun'), p: chart.planets.find((x) => x.name === 'Sun') },
              { label: t('astro.res.moon'), p: chart.planets.find((x) => x.name === 'Moon') },
              { label: t('astro.res.rising'), p: chart.angles.ascendant },
            ].map((x, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                <p className="text-[10px] tracking-[0.25em] text-muted uppercase">{x.label}</p>
                <p className="mt-2 text-lg text-frost">
                  {x.p ? (
                    <>{x.p.symbol} <span className="font-display tracking-[0.08em]">
                      {zhMode ? `${x.p.signZh}座 ${x.p.degInSign.toFixed(1)}°` : `${x.p.sign} ${x.p.degInSign.toFixed(1)}°`}
                    </span></>
                  ) : (
                    <span className="text-[11px] text-muted/50">{t('astro.res.noTime')}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* 3D 轮盘 (C1): 点星体看落座/落宫/相位/互溶接纳标注 */}
          <ChartWheel chart={chart} zhMode={zhMode} />

          {/* 行星落座落宫表 */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] tracking-[0.2em] text-muted uppercase">
                  <th className="px-4 py-2.5 font-normal">{t('astro.res.planet')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('astro.res.signDeg')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('astro.res.house')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('astro.res.state')}</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.map((p) => (
                  <tr key={p.name} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2 text-frost/90">
                      <span className="mr-2 text-accent/80">{p.symbol}</span>
                      {zhMode ? p.zh : p.name}
                      {p.retrograde && <span className="ml-1.5 text-[10px] text-[#e8a08a]">℞</span>}
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {zhMode ? `${p.signZh} ${p.degInSign.toFixed(1)}°` : `${p.sign} ${p.degInSign.toFixed(1)}°`}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.house ?? '—'}</td>
                    <td className="px-4 py-2 text-[11px]">
                      {p.dignity && p.dignity.state !== 'Peregrine' ? (
                        <span className={p.dignity.strength > 0 ? 'text-[#cdb88a]' : 'text-[#e8a08a]'}>
                          {DIGNITY_ZH[p.dignity.state] ?? p.dignity.state}
                        </span>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 主要相位 */}
          <div>
            <p className="mb-2.5 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.res.aspects')}</p>
            <div className="flex flex-wrap gap-2">
              {[...chart.aspects].sort((x, y) => x.orb - y.orb).slice(0, 12).map((a, i) => (
                <span key={i} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-muted">
                  {a.symbol} {zhMode ? `${PLANET_ZH_MINI[a.a] ?? a.a}–${PLANET_ZH_MINI[a.b] ?? a.b}` : `${a.a}–${a.b}`} <span className="text-accent/70">{a.orb.toFixed(1)}°</span>
                  {a.applying === true && <span className="ml-1 text-[#8aa8d8]">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* 下一里程碑预告 */}
          <p className="pt-2 text-center text-[11px] tracking-[0.15em] text-muted/60">
            {t('astro.res.nextHint')}
          </p>
        </div>
      )}
    </div>
  );
}
