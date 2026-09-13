'use client';

// ============================================================
// 修改排盘信息弹窗 — 输错名字/时间/地点就地改, 不必回头重填整表
// 复用 BirthplacePicker; 保存 → 组装新 URL (保留宫制与全部设置) → 重排盘
// ============================================================

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import BirthplacePicker, { type BirthPlace } from '@/components/astro/BirthplacePicker';
import type { BirthData } from '@/lib/astro/chart';

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-frost ' +
  'outline-none transition-colors placeholder:text-muted/40 focus:border-accent/40';
const labelCls = 'mb-1 block text-[10px] tracking-[0.25em] text-muted uppercase';

export default function EditBirth({ birth, open, onClose, onSave }: {
  birth: BirthData;
  open: boolean;
  onClose: () => void;
  onSave: (b: BirthData) => void;
}) {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const [label, setLabel] = useState(birth.label ?? '');
  const [year, setYear] = useState(String(birth.year));
  const [month, setMonth] = useState(String(birth.month));
  const [day, setDay] = useState(String(birth.day));
  const [hour, setHour] = useState(String(birth.hour));
  const [minute, setMinute] = useState(String(birth.minute));
  const [timeKnown, setTimeKnown] = useState(birth.timeKnown !== false);
  const [place, setPlace] = useState<BirthPlace>(() => ({
    lat: birth.latitude, lng: birth.longitude, tz: birth.timezone,
    label: birth.city ?? '', cnCode: birth.cnCode,
  }));
  const [err, setErr] = useState('');

  // 每次打开都以当前盘面为准重置 (父级可能已换盘)
  useEffect(() => {
    if (!open) return;
    setLabel(birth.label ?? '');
    setYear(String(birth.year)); setMonth(String(birth.month)); setDay(String(birth.day));
    setHour(String(birth.hour)); setMinute(String(birth.minute));
    setTimeKnown(birth.timeKnown !== false);
    setPlace({ lat: birth.latitude, lng: birth.longitude, tz: birth.timezone, label: birth.city ?? '', cnCode: birth.cnCode });
    setErr('');
  }, [open, birth]);

  if (!open) return null;

  const save = () => {
    setErr('');
    const b: BirthData = {
      year: +year, month: +month, day: +day, hour: +hour, minute: +minute,
      timezone: place.tz, latitude: place.lat, longitude: place.lng,
      city: place.label, cnCode: place.cnCode,
      label: label.trim() || undefined,
      houseSystem: birth.houseSystem, timeKnown,
    };
    if (!(b.year >= 1900 && b.year <= 2100) || !(b.month >= 1 && b.month <= 12) || !(b.day >= 1 && b.day <= 31)) { setErr(t('astro.form.failed')); return; }
    if (timeKnown && (!(b.hour >= 0 && b.hour <= 23) || !(b.minute >= 0 && b.minute <= 59))) { setErr(t('astro.form.failed')); return; }
    if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) { setErr(t('astro.form.failed')); return; }
    onSave(b);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0f1c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base tracking-[0.18em] text-frost">{t('astro.edit.title')}</h3>
          <button onClick={onClose} className="text-muted transition-colors hover:text-frost" aria-label="close">✕</button>
        </div>

        <div className="mb-3">
          <label className={labelCls}>{t('astro.form.label')}</label>
          <input value={label} maxLength={30} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder={t('astro.form.labelPh')} />
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3">
          <div><label className={labelCls}>{t('astro.form.year')}</label><input type="number" inputMode="numeric" value={year} min={1900} max={2100} onChange={(e) => setYear(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>{t('astro.form.month')}</label><input type="number" inputMode="numeric" value={month} min={1} max={12} onChange={(e) => setMonth(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>{t('astro.form.day')}</label><input type="number" inputMode="numeric" value={day} min={1} max={31} onChange={(e) => setDay(e.target.value)} className={inputCls} /></div>
        </div>

        <BirthplacePicker value={place} onChange={setPlace} />

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className={timeKnown ? '' : 'pointer-events-none opacity-35'}>
            <label className={labelCls}>{t('astro.form.hour')}</label>
            <input type="number" inputMode="numeric" value={hour} min={0} max={23} disabled={!timeKnown} onChange={(e) => setHour(e.target.value)} className={inputCls + ' w-24'} />
          </div>
          <div className={timeKnown ? '' : 'pointer-events-none opacity-35'}>
            <label className={labelCls}>{t('astro.form.minute')}</label>
            <input type="number" inputMode="numeric" value={minute} min={0} max={59} disabled={!timeKnown} onChange={(e) => setMinute(e.target.value)} className={inputCls + ' w-24'} />
          </div>
          <button type="button" onClick={() => setTimeKnown((v) => !v)}
            className={`rounded-full border px-4 py-2 text-[11px] tracking-[0.15em] transition-colors ${!timeKnown ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}>
            {t('astro.form.noTime')}
          </button>
        </div>

        {err && <p className="mt-3 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-3 py-2 text-[12px] text-[#e8a08a]">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-white/[0.1] px-5 py-2.5 text-[11px] tracking-[0.18em] text-muted transition-colors hover:border-white/25 hover:text-frost">{t('astro.edit.cancel')}</button>
          <button onClick={save} disabled={!place.label || !Number.isFinite(place.lat)} className="glass-btn-primary rounded-full px-6 py-2.5 text-[11px] tracking-[0.2em] disabled:opacity-40">{t('astro.edit.save')}</button>
        </div>
      </div>
    </div>
  );
}
