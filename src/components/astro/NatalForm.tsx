'use client';

// ============================================================
// 本命盘排盘器 (占星板块 A1)
// 流程: 填生辰 → 跳转 /astrology/chart?URL编码生辰 (独立星盘页, 可分享/收藏)
// 铁律: 盘面数据来自引擎, 本页只收集资料不展示不修饰
// ============================================================

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';
import { ALL_CITIES, findCity } from '@/lib/astro/cities';
import { paramsFromBirth } from '@/lib/astro/chart-url';
import type { BirthData, HouseSystem } from '@/lib/astro/chart';

const HOUSE_SYSTEMS: { value: HouseSystem; zh: string }[] = [
  { value: 'placidus', zh: '普拉西德' },
  { value: 'koch', zh: '科赫' },
  { value: 'equal', zh: '等宫' },
  { value: 'whole-sign', zh: '整宫' },
  { value: 'porphyry', zh: '波菲里' },
  { value: 'regiomontanus', zh: '雷吉奥蒙塔努斯' },
  { value: 'campanus', zh: '坎帕努斯' },
];

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost ' +
  'outline-none transition-colors placeholder:text-muted/40 focus:border-accent/40';
const labelCls = 'mb-1.5 block text-[10px] tracking-[0.25em] text-muted uppercase';

export default function NatalForm() {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();

  const [year, setYear] = useState('1995');
  const [month, setMonth] = useState('6');
  const [day, setDay] = useState('15');
  const [hour, setHour] = useState('14');
  const [minute, setMinute] = useState('30');
  const [timeKnown, setTimeKnown] = useState(true);
  const [cityId, setCityId] = useState('beijing');
  const [houseSystem, setHouseSystem] = useState<HouseSystem>('placidus');
  const [error, setError] = useState('');

  const city = useMemo(() => findCity(cityId), [cityId]);

  const cast = () => {
    setError('');
    const b: BirthData = {
      year: +year, month: +month, day: +day,
      hour: +hour, minute: +minute,
      timezone: city?.tz ?? 8,
      latitude: city?.lat ?? 39.9042,
      longitude: city?.lng ?? 116.4074,
      city: zhMode ? city?.zh : city?.en,
      houseSystem, timeKnown,
    };
    if (!(b.year >= 1900 && b.year <= 2100) || !(b.month >= 1 && b.month <= 12) || !(b.day >= 1 && b.day <= 31)) {
      setError(t('astro.form.failed')); return;
    }
    if (timeKnown && (!(b.hour >= 0 && b.hour <= 23) || !(b.minute >= 0 && b.minute <= 59))) {
      setError(t('astro.form.failed')); return;
    }
    // 本地粗校验通过, 跳独立星盘页 (页内 API 还有白名单严校验)
    router.push(`/astrology/chart?${paramsFromBirth(b)}`);
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
        disabled={!city}
        className="glass-btn-primary mt-6 w-full py-3.5 text-sm tracking-[0.3em] disabled:opacity-40"
      >
        {t('astro.form.cast')}
      </button>

      {error && (
        <p className="mt-3 text-center text-[12px] text-[#e8a08a]">{error}</p>
      )}
    </div>
  );
}
