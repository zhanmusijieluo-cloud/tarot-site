'use client';

// ============================================================
// 出生地选择器 (A5 v2) — 三模式
// 中国: 省→市→区县三级联动 (public/astro/cn-cities.json 懒加载, 34省370市3181区)
// 海外: 预置世界城市库 (全 UTC+标准偏移, 夏令时提示)
// 手动: 自填经纬度+时区 (任意地点)
// 输出: BirthPlace → 组装进 BirthData
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { CITIES_WORLD } from '@/lib/astro/cities';
import { loadCnCities, type CnProvince } from '@/lib/astro/cn-cities';

export interface BirthPlace {
  lat: number
  lng: number
  tz: number
  /** 展示名, 如 "广东·广州" / "London" */
  label: string
  /** 中国三级编码 "省~市~区" (URL 用); 非中国为 undefined */
  cnCode?: string
}

type Mode = 'cn' | 'world' | 'manual';

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost ' +
  'outline-none transition-colors placeholder:text-muted/40 focus:border-accent/40';
const labelCls = 'mb-1.5 block text-[10px] tracking-[0.25em] text-muted uppercase';
const selCls = inputCls + ' appearance-none';

export default function BirthplacePicker({ value, onChange }: {
  value: BirthPlace;
  onChange: (p: BirthPlace) => void;
}) {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  // 外部传入 value 回填初值 (编辑弹窗打开时不假装是北京)
  const initCn = (value.cnCode ?? '').split('~').filter(Boolean)
  const [mode, setMode] = useState<Mode>(() => (value.cnCode || !Number.isFinite(value.lat) ? 'cn' : 'manual'));
  const [provs, setProvs] = useState<CnProvince[]>([]);
  const [provName, setProvName] = useState(initCn[0] ?? '北京');
  const [cityName, setCityName] = useState(initCn[1] ?? '北京');
  const [distName, setDistName] = useState(initCn[2] ?? '北京');
  useEffect(() => {
    let on = true;
    loadCnCities().then((list) => { if (on) setProvs(list); }).catch(() => {});
    return () => { on = false; };
  }, []);

  const prov = useMemo(() => provs.find((p) => p.name === provName), [provs, provName]);
  const city = useMemo(() => prov?.cities.find((c) => c.name === cityName), [prov, cityName]);
  const isFlat = !!prov && prov.cities.length === 1 && prov.cities[0].name === prov.name; // 直辖市

  const pickProv = (name: string) => {
    setProvName(name);
    const p = provs.find((x) => x.name === name);
    const c = p?.cities[0];
    setCityName(c?.name ?? name);
    const d = c?.districts[0];
    setDistName(d?.name ?? name);
    if (p && c && d) emitCn(p.name, c.name, d.name);
  };
  const pickCity = (name: string) => {
    setCityName(name);
    const c = prov?.cities.find((x) => x.name === name);
    const d = c?.districts[0];
    setDistName(d?.name ?? name);
    if (c && d) emitCn(provName, c.name, d.name);
  };
  const pickDist = (name: string) => {
    setDistName(name);
    const d = city?.districts.find((x) => x.name === name);
    if (d) emitCn(provName, cityName, d.name);
  };
  const emitCn = (pn: string, cn: string, dn: string) => {
    const d = provs.find((p) => p.name === pn)?.cities.find((c) => c.name === cn)?.districts.find((x) => x.name === dn);
    if (!d) return;
    const cityLabel = pn === dn ? pn : `${pn}·${dn}`;
    onChange({
      lat: d.lat, lng: d.lng, tz: 8,
      label: lang === 'ja' ? cityLabel : zhMode ? cityLabel : `${pn} ${dn}`,
      cnCode: `${pn}~${cn}~${dn}`,
    });
  };
  // 初始中国值 = 北京 (与默认 value 一致, 不覆盖用户切走的手动/海外选择)
  useEffect(() => {
    if (!provs.length || mode !== 'cn' || value.cnCode) return;
    const bj = provs.find((p) => p.name === '北京');
    const c = bj?.cities[0], d = c?.districts[0];
    if (bj && c && d && c.name === '北京' && d.name === '北京') {
      setProvName('北京'); setCityName('北京'); setDistName('北京');
    }
  }, [provs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 海外 ----
  const pickWorld = (id: string) => {
    const c = CITIES_WORLD.find((x) => x.id === id);
    if (!c) return;
    onChange({ lat: c.lat, lng: c.lng, tz: c.tz, label: lang === 'ja' ? c.zh : zhMode ? c.zh : c.en });
  };

  // ---- 手动 ----
  const [mlat, setMlat] = useState(() => (Number.isFinite(value.lat) ? String(value.lat) : ''));
  const [mlng, setMlng] = useState(() => (Number.isFinite(value.lng) ? String(value.lng) : ''));
  const [mtz, setMtz] = useState(() => String(value.tz ?? 8));
  const [mcity, setMcity] = useState(() => (/^-?[\d.]+,\s*-?[\d.]+$/.test(value.label ?? '') ? '' : value.label ?? ''));
  const emitManual = () => {
    const la = Number(mlat), ln = Number(mlng), tz = Number(mtz);
    if (!Number.isFinite(la) || !Number.isFinite(ln) || !Number.isFinite(tz)) return;
    onChange({ lat: la, lng: ln, tz, label: mcity.trim() || `${la.toFixed(2)}, ${ln.toFixed(2)}` });
  };

  const TABS: { m: Mode; label: string }[] = [
    { m: 'cn', label: t('astro.place.cn') },
    { m: 'world', label: t('astro.place.world') },
    { m: 'manual', label: t('astro.place.manual') },
  ];

  return (
    <div>
      {/* 模式切换 */}
      <div className="mb-3 inline-flex rounded-full border border-white/[0.1] p-0.5">
        {TABS.map((tb) => (
          <button
            key={tb.m}
            type="button"
            onClick={() => {
              setMode(tb.m);
              if (tb.m === 'cn' && provs.length) {
                const p = provs.find((x) => x.name === provName) ?? provs[0];
                const c = p.cities[0]; const d = c?.districts[0];
                if (d) emitCn(p.name, c.name, d.name);
              }
              if (tb.m === 'world') pickWorld(CITIES_WORLD[0].id);
              if (tb.m === 'manual') { setMlat(String(value.lat)); setMlng(String(value.lng)); }
            }}
            className={`rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${
              mode === tb.m ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'text-muted hover:text-frost'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {mode === 'cn' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>{t('astro.place.province')}</label>
            <select value={provName} onChange={(e) => pickProv(e.target.value)} className={selCls}>
              {!provs.length && <option className="bg-[#0b0e17]">{t('astro.place.loading')}</option>}
              {provs.map((p) => <option key={p.name} value={p.name} className="bg-[#0b0e17]">{p.name}</option>)}
            </select>
          </div>
          {!isFlat && (
            <div>
              <label className={labelCls}>{t('astro.place.city')}</label>
              <select value={cityName} onChange={(e) => pickCity(e.target.value)} className={selCls}>
                {prov?.cities.map((c) => <option key={c.name} value={c.name} className="bg-[#0b0e17]">{c.name}</option>)}
              </select>
            </div>
          )}
          <div className={isFlat ? 'sm:col-span-2' : ''}>
            <label className={labelCls}>{isFlat ? t('astro.place.city') : t('astro.place.district')}</label>
            <select value={distName} onChange={(e) => pickDist(e.target.value)} className={selCls}>
              {city?.districts.map((d) => <option key={d.name} value={d.name} className="bg-[#0b0e17]">{d.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {mode === 'world' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t('astro.form.city')}</label>
            <select value={CITIES_WORLD.find((c) => Math.abs(c.lat - value.lat) < 1e-4)?.id ?? CITIES_WORLD[0].id}
              onChange={(e) => pickWorld(e.target.value)} className={selCls}>
              {CITIES_WORLD.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0b0e17]">
                  {lang === 'ja' ? c.zh : zhMode ? c.zh : c.en}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <p className="text-[11px] leading-snug text-muted/70">{t('astro.place.dstHint')}</p>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{t('astro.place.lat')}</label>
              <input type="number" step="0.0001" value={mlat} onChange={(e) => setMlat(e.target.value)} onBlur={emitManual} className={inputCls} placeholder="39.9042" />
            </div>
            <div>
              <label className={labelCls}>{t('astro.place.lng')}</label>
              <input type="number" step="0.0001" value={mlng} onChange={(e) => setMlng(e.target.value)} onBlur={emitManual} className={inputCls} placeholder="116.4074" />
            </div>
            <div>
              <label className={labelCls}>{t('astro.place.tz')}</label>
              <input type="number" step="0.5" value={mtz} onChange={(e) => setMtz(e.target.value)} onBlur={emitManual} className={inputCls} placeholder="8" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('astro.place.placeName')}</label>
              <input value={mcity} onChange={(e) => setMcity(e.target.value)} onBlur={emitManual} className={inputCls} placeholder={lang === 'ja' ? '例: ラサ' : zhMode ? '如: 拉萨·当雄' : 'e.g. Lhasa'} />
            </div>
            <div className="flex items-end pb-2">
              <p className="text-[11px] leading-snug text-muted/70">{t('astro.place.manualHint')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 当前地点回显 */}
      <p className="mt-2 text-[11px] text-muted/70">
        {t('astro.place.current')}: <span className="text-frost/80">{value.label}</span>
        <span className="ml-2 text-muted/50">{value.lat.toFixed(3)}, {value.lng.toFixed(3)} · UTC{value.tz >= 0 ? '+' : ''}{value.tz}</span>
      </p>
    </div>
  );
}
