'use client';

// ============================================================
// 独立星盘页 /astrology/chart
// 生辰全部编码在 URL → 可分享/收藏/刷新不丢; 进页即自动排盘
// 切宫制 = 改 URL = 重排盘 (URL 始终是盘面真相)
// ============================================================

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { useI18n } from '@/i18n';
import ChartResult from '@/components/astro/ChartResult';
import EditBirth from '@/components/astro/EditBirth';
import ChartSettings from '@/components/astro/ChartSettings';
import DynResult from '@/components/astro/DynResult';
import type { DynamicChart } from '@/lib/astro/dynamic';
import BandResult from '@/components/astro/BandResult';
import TimeStepper from '@/components/astro/TimeStepper';
import SynastryResult, { type SynData } from '@/components/astro/SynastryResult';
import { loadArchivesSmart, saveArchiveSmart, deleteArchiveSmart, type Archive } from '@/lib/astro/archives';
import type { VChart } from '@/components/astro/ChartWheel';
import { birthFromParams, paramsFromBirth, settingsFromParams, settingsToParams } from '@/lib/astro/chart-url';
import { HOUSE_SYSTEM_ZH, type BirthData, type CastSettings, type HouseSystem } from '@/lib/astro/chart';

const SYS_ZH = HOUSE_SYSTEM_ZH;

function ChartPageInner() {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();
  const sp = useSearchParams();

  const birth = useMemo(() => birthFromParams(new URLSearchParams(sp.toString())), [sp]);
  const settings = useMemo(() => settingsFromParams(new URLSearchParams(sp.toString())) ?? {}, [sp]);
  const aspectMode = (sp.get('ag') === 'list' ? 'list' : 'grid') as 'list' | 'grid';
  // ---- 动态盘: 盘种 dp=t三限/s次限/tr行运/sr日返/lr月返/arc日弧 (天象/法达占位); 目标日期 dpy/dpm/dpd ----
  const dpKey = sp.get('dp') ?? '';
  const DYN_TYPE: Record<string, string> = { t: 'tertiary', s: 'progression', tr: 'transit', sr: 'solar-return', lr: 'lunar-return', arc: 'solar-arc' };
  const dynType = DYN_TYPE[dpKey] ?? '';
  const dpMode = dynType !== '';
  const nowD = new Date();
  const dpy = Number(sp.get('dpy')) || nowD.getFullYear();
  const dpm = Number(sp.get('dpm')) || nowD.getMonth() + 1;
  const dpd = Number(sp.get('dpd')) || nowD.getDate();
  // 目标时分 (天象/行运用; 推运类忽略时分但 URL 可带)
  const dpHour = sp.get('dph') !== null ? Math.min(23, Math.max(0, Number(sp.get('dph')) || 0)) : nowD.getHours();
  const dpMin = sp.get('dpmi') !== null ? Math.min(59, Math.max(0, Number(sp.get('dpmi')) || 0)) : nowD.getMinutes();
  // 访客本地时区 (爸爸: 同步当地时间, 别人进来=各自当下; 行运/天象瞬时按此换算)
  const tzLocal = -nowD.getTimezoneOffset() / 60;
  const backToNow = () => patchParams((p) => { p.delete('dpy'); p.delete('dpm'); p.delete('dpd'); p.delete('dph'); p.delete('dpmi'); });
  const [dyn, setDyn] = useState<DynamicChart | null>(null);
  const [dynErr, setDynErr] = useState('');

  const [data, setData] = useState<VChart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef('');
  const reqSeq = useRef(0);

  const cast = useCallback((sys: HouseSystem, s: CastSettings) => {
    if (!birth) return;
    const seq = ++reqSeq.current; // 竞态守卫: 只接受最后一次请求的结果
    setLoading(true); setError('');
    fetch('/api/astro/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: { ...birth, houseSystem: sys }, settings: s }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'failed');
        if (seq !== reqSeq.current) return; // 更新请求已在路上, 丢弃本次
        setData(j.chart as VChart);
      })
      .catch(() => { if (seq === reqSeq.current) setError(t('astro.form.failed')); })
      .finally(() => { if (seq === reqSeq.current) setLoading(false); });
  }, [birth, t]);

  useEffect(() => {
    // 生辰或设置变化 → 重排盘; key 去重防同盘重复请求
    if (!birth) return;
    const key = `${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}-${birth.latitude}-${birth.longitude}-${birth.houseSystem}-${JSON.stringify(settings)}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    cast(birth.houseSystem ?? 'placidus', settings);
  }, [birth, settings, cast]);

  // 写 URL (URL 始终是盘面真相); 保留其余参数
  const patchParams = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(sp.toString());
    mut(next);
    router.replace(`/astrology/chart?${next.toString()}`, { scroll: false });
  };
  const switchSystem = (sys: HouseSystem) => patchParams((p) => p.set('sys', sys));
  const applySettings = (s: CastSettings) => patchParams((p) => {
    for (const k of ['bd', 'as', 'ob', 'nd', 'lil', 'oos', 'pen', 'min', 'sc', 'ts', 'dp']) p.delete(k);
    settingsToParams(s, p);
  });
  // 打开设置抽屉指定 Tab (nonce 触发)
  const [tabSignal, setTabSignal] = useState<{ tab: string; nonce: number } | undefined>(undefined);
  const openSettings = (tab: string) => setTabSignal({ tab, nonce: Date.now() });

  // 编辑排盘资料 (输错名字/时间/地点就地改): 重写全部生辰键, 设置与宫制键原样保留
  const [editOpen, setEditOpen] = useState(false);
  const BIRTH_KEYS = ['y', 'mo', 'd', 'h', 'mi', 'n', 'cn', 'cid', 'lat', 'lng', 'tz', 'city', 'nt'];
  const saveBirth = (b: BirthData) => {
    patchParams((pp) => {
      for (const k of BIRTH_KEYS) pp.delete(k);
      const fresh = new URLSearchParams(paramsFromBirth({ ...b, houseSystem: b.houseSystem ?? 'placidus' }));
      for (const k of BIRTH_KEYS.concat('sys')) { const v = fresh.get(k); if (v !== null) pp.set(k, v); }
    });
    setEditOpen(false);
  };

  // 次限盘数据 (dp=s 时请求; 换日期/设置自动重算)
  useEffect(() => {
    if (!birth || !dynType) { setDyn(null); setDynErr(''); return; }
    let alive = true;
    setDynErr('');
    fetch('/api/astro/chart/dynamic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: { ...birth, houseSystem: birth.houseSystem ?? 'placidus' }, settings, type: dynType, target: { year: dpy, month: dpm, day: dpd, hour: dpHour, minute: dpMin, tzOffset: tzLocal } }),
    })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'failed'); if (alive) setDyn(j.chart as DynamicChart); })
      .catch((e) => { if (alive) setDynErr(e instanceof Error ? e.message : t('astro.form.failed')); });
    return () => { alive = false; };
  }, [birth, settings, dynType, dpy, dpm, dpd, dpHour, dpMin, tzLocal, t]);

  // ---- 法达盘 / 小限盘 (纯前端: 盘+外环, 用本命数据) / 天象盘 (纯天象) ----
  const bandKind: 'firdaria' | 'profection' | null = dpKey === 'fir' ? 'firdaria' : dpKey === 'prof' ? 'profection' : null;
  const skyMode = dpKey === 'sky';
  const [sky, setSky] = useState<VChart | null>(null);
  const skyBirth = useMemo(() => {
    if (!birth || !skyMode) return null;
    // 访客本地钟表 y/m/d h:mi + 本地时区 → 瞬时 → 出生地时区钟表时间 (天象=访客此刻, 跨时区看也准)
    const utcMs = Date.UTC(dpy, dpm - 1, dpd, dpHour, dpMin) - tzLocal * 3600e3;
    const dtB = new Date(utcMs + (birth.timezone ?? 0) * 3600e3);
    return {
      ...birth,
      year: dtB.getUTCFullYear(), month: dtB.getUTCMonth() + 1, day: dtB.getUTCDate(),
      hour: dtB.getUTCHours(), minute: dtB.getUTCMinutes(), timeKnown: true,
      label: zhMode ? '天象盘' : 'Sky chart',
    };
  }, [birth, skyMode, dpy, dpm, dpd, dpHour, dpMin, tzLocal, zhMode]);
  useEffect(() => {
    if (!skyBirth) { setSky(null); return; }
    let alive = true;
    fetch('/api/astro/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: { ...skyBirth, houseSystem: skyBirth.houseSystem ?? 'placidus' }, settings }),
    })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'failed'); if (alive) setSky(j.chart as VChart); })
      .catch(() => { if (alive) setSky(null); });
    return () => { alive = false; };
  }, [skyBirth, settings]);

  // ---- 合盘 (爸爸: 天象盘左边合盘窗口 — sync=档案id, stab=盘种Tab) ----
  const syncId = sp.get('sync') ?? '';
  const stab = sp.get('stab') ?? 'compA';
  const [arc, setArc] = useState<Archive | null>(null);
  const [syn, setSyn] = useState<SynData | null>(null);
  const [synErr, setSynErr] = useState('');
  const [synOpen, setSynOpen] = useState(false);
  const [newArcOpen, setNewArcOpen] = useState(false);
  const [arcList, setArcList] = useState<Archive[]>([]);
  useEffect(() => {
    if (!syncId) { setArc(null); return; }
    let alive = true;
    loadArchivesSmart().then((r) => { if (alive) setArc(r.list.find((x) => x.id === syncId) ?? null); });
    return () => { alive = false; };
  }, [syncId]);
  useEffect(() => {
    if (synOpen || newArcOpen) loadArchivesSmart().then((r) => setArcList(r.list));
  }, [synOpen, newArcOpen]);
  useEffect(() => {
    if (!birth || !arc) { setSyn(null); setSynErr(''); return; }
    let alive = true;
    setSynErr('');
    fetch('/api/astro/chart/synastry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthA: { ...birth, houseSystem: birth.houseSystem ?? 'placidus' }, birthB: arc.birth, settings }),
    })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'failed'); if (alive) setSyn(j.chart as SynData); })
      .catch((e) => { if (alive) setSynErr(e instanceof Error ? e.message : t('astro.form.failed')); });
    return () => { alive = false; };
  }, [birth, arc, settings, t]);

  // 排完盘自动存档 (爸爸: 有的人不记得手动保存; 只在本命盘视图 + 有盘档案名时存, 查重防重复)
  const autoStashed = useRef('');
  useEffect(() => {
    if (!data || !birth) return;
    if (dynType || skyMode || bandKind || syncId || arc) return;
    const lbl = (birth.label ?? '').trim();
    if (!lbl) return;
    const fp = `${lbl}|${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}`;
    if (autoStashed.current === fp) return;
    autoStashed.current = fp;
    (async () => {
      const cur = await loadArchivesSmart();
      const dup = cur.list.find((x) => x.label === lbl && x.birth.year === birth.year && x.birth.month === birth.month && x.birth.day === birth.day && x.birth.hour === birth.hour && x.birth.minute === birth.minute);
      if (!dup) await saveArchiveSmart(birth);
    })().catch(() => {});
  }, [data, birth, dynType, skyMode, bandKind, syncId, arc]);

  // 新增档案的默认出生资料 (EditBirth 初始值)
  const emptyB: BirthData = { year: 1995, month: 1, day: 1, hour: 12, minute: 0, timezone: 8, latitude: 39.9, longitude: 116.41, city: '北京', timeKnown: true, houseSystem: 'placidus' };



  if (!birth) {
    return (
      <PageShell label={t('page.astrology.label')} title={t('astro.chart.title')} wide>
        <div className="py-24 text-center">
          <p className="text-sm text-muted">{t('astro.chart.noData')}</p>
          <button onClick={() => router.push('/astrology')} className="glass-btn-primary mt-6 px-8 py-3 text-xs tracking-[0.25em]">
            {t('astro.chart.backForm')}
          </button>
        </div>
      </PageShell>
    );
  }

  // 资料卡下方竖排操作 (编辑资料/宫位设置/排盘设置)
  const housesSettingsBlock = (
    <>
      <button
        onClick={() => openSettings('houses')}
        title={t('astro.set.houseHint')}
        className="flex w-full items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-[9px] text-left text-[11.5px] text-frost/75 shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent"
      >
        <span className="text-[12px]">⬡</span> {zhMode ? '宫位设置' : 'Houses'}
        <span className="ml-auto text-[10px] text-muted/70">{zhMode ? (SYS_ZH[data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus'] ?? data?.houseSystemUsed ?? '普拉西德') : (data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus')} ▾</span>
      </button>
      <ChartSettings
        variant="block"
        value={settings}
        onChange={applySettings}
        sys={data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus'}
        onSysChange={(s) => switchSystem(s as HouseSystem)}
        tabSignal={tabSignal}
      />
    </>
  );
  const cornerActions = (
    <>
      <button
        onClick={() => setEditOpen(true)}
        title={t('astro.edit.hint')}
        className="flex w-full items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-[9px] text-left text-[11.5px] text-frost/75 shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent"
      >
        <span className="text-[12px]">✎</span> {t('astro.edit.btn')}
      </button>
      {housesSettingsBlock}
    </>
  );
  // 合盘模式: 不能修改盘资料 → 去掉「编辑资料」按钮版 (爸爸)
  const cornerActionsNoEdit = housesSettingsBlock;


  return (
    <PageShell
      label={t('page.astrology.label')}
      title={t('astro.chart.title')}
      subtitle={t('astro.chart.sub')}
      wide
      compact
    >
      <section className="mb-10 mt-4">
        {/* 盘种切换条 (爸爸: 本命/三限/次限/行运/日返/月返/日弧/天象/法达) */}
        <div className={`mb-3 flex flex-wrap items-center justify-center gap-1.5${syncId ? ' hidden' : ''}`}>
          <button
            onClick={() => setSynOpen(true)}
            title={zhMode ? '选择档案与当下本命盘合盘' : 'Synastry with an archive'}
            className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${syncId ? 'border-accent/50 bg-accent/[0.08] text-accent' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
          >
            ☍ {zhMode ? '合盘' : 'Synastry'}
          </button>
          <span className="mx-1 h-4 w-px bg-white/[0.12]" aria-hidden />
          {([
            ['sky', zhMode ? '天象盘' : 'Sky'],
            ['', zhMode ? '本命盘' : 'Natal'],
            ['tr', zhMode ? '行运盘' : 'Transit'],
            ['t', zhMode ? '三限盘' : 'Tertiary'],
            ['s', zhMode ? '次限盘' : 'Secondary'],
            ['lr', zhMode ? '月返盘' : 'Lunar Return'],
            ['sr', zhMode ? '日返盘' : 'Solar Return'],
            ['fir', zhMode ? '法达' : 'Firdaria'],
            ['arc', zhMode ? '日弧' : 'Solar Arc'],
            ['prof', zhMode ? '小限' : 'Profection'],
          ] as [string, string][]).map(([key, label]) => {
            const disabled = false;
            const active = dpKey === key;
            return (
              <button
                key={key || 'natal'}
                aria-disabled={disabled || undefined}
                title={disabled ? `${label} · ${zhMode ? '开发中, 敬请期待' : 'in development'}` : undefined}
                onClick={() => {
                  if (disabled) return;
                  patchParams((p) => {
                    p.delete('sync'); p.delete('stab');   // 点盘种=退出合盘视图
                    if (key) p.set('dp', key);
                    else { p.delete('dp'); p.delete('dpy'); p.delete('dpm'); p.delete('dpd'); }
                  });
                }}
                className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${active ? 'border-accent/50 bg-accent/[0.08] text-accent' : disabled ? 'cursor-not-allowed border-white/[0.06] text-muted/35' : 'border-white/[0.1] text-muted hover:border-white/25'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 控制行(仅小屏): 大屏时三按钮已嵌入盘内资料卡下方竖排 (爸爸: 嵌入卡下) */}
        <div className={`mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11.5px] text-muted lg:hidden${syncId ? ' hidden' : ''}`}>
          <button
            onClick={() => openSettings('houses')}
            className="rounded-full border border-white/[0.12] px-2.5 py-0.5 text-[10.5px] text-frost/75 transition-colors hover:border-accent/40 hover:text-accent"
            title={t('astro.set.houseHint')}
          >
            {zhMode ? '宫位设置 · ' : 'Houses · '}{zhMode ? (SYS_ZH[data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus'] ?? data?.houseSystemUsed ?? '普拉西德') : (data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus')}
            <span className="ml-1 text-[8px] text-muted/60">▾</span>
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-full border border-white/[0.12] px-2.5 py-0.5 text-[10.5px] text-frost/75 transition-colors hover:border-accent/40 hover:text-accent"
            title={t('astro.edit.hint')}
          >
            ✎ {t('astro.edit.btn')}
          </button>
          <ChartSettings
            value={settings}
            onChange={applySettings}
            sys={data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus'}
            onSysChange={(s) => switchSystem(s as HouseSystem)}
            tabSignal={tabSignal}
          />
        </div>

        {error && (
          <p className="mb-5 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-3 text-center text-[12px] text-[#e8a08a]">
            {error} · <button onClick={() => cast(birth.houseSystem ?? 'placidus', settings)} className="underline">{t('astro.chart.retry')}</button>
          </p>
        )}
        {loading && !data && (
          <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
        )}
        <EditBirth birth={birth} open={editOpen} onClose={() => setEditOpen(false)} onSave={saveBirth} />
        {syncId ? (
          !arc ? (
            <p className="py-20 text-center text-[12px] text-muted">{zhMode ? '档案不存在 (可能已删除) — 请重新选择' : 'Archive not found'}</p>
          ) : syn ? (
            <SynastryResult
              syn={syn}
              zhMode={zhMode}
              tab={stab}
              onTab={(tt) => patchParams((p) => p.set('stab', tt))}
              aLabel={birth?.label ?? (zhMode ? '主盘' : 'Main')}
              bLabel={arc.label}
              onExit={() => patchParams((p) => { p.delete('sync'); p.delete('stab'); })}
              cornerActions={cornerActionsNoEdit}
            />
          ) : synErr ? (
            <p className="mb-5 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-3 text-center text-[12px] text-[#e8a08a]">{synErr}</p>
          ) : (
            <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
          )
        ) : skyMode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11.5px] text-muted">
              <span>{zhMode ? '天象时刻' : 'Sky time'}</span>
              <input
                type="date"
                value={`${dpy}-${String(dpm).padStart(2, '0')}-${String(dpd).padStart(2, '0')}`}
                min="1900-01-01"
                max="2100-12-31"
                onChange={(e) => {
                  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.target.value);
                  if (m) patchParams((p) => { p.set('dpy', m[1]); p.set('dpm', String(Number(m[2]))); p.set('dpd', String(Number(m[3]))); });
                }}
                className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[11.5px] text-frost [color-scheme:dark]"
              />
              <input
                type="time"
                value={`${String(dpHour).padStart(2, '0')}:${String(dpMin).padStart(2, '0')}`}
                onChange={(e) => {
                  const m = /^(\d{2}):(\d{2})$/.exec(e.target.value);
                  if (m) patchParams((p) => { p.set('dph', String(Number(m[1]))); p.set('dpmi', String(Number(m[2]))); });
                }}
                className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[11.5px] text-frost [color-scheme:dark]"
              />
              <span className="text-muted/60">{zhMode ? '纯天象盘 (地点沿用本命; 不含本命对照)' : 'Pure sky chart (birth location; no natal overlay)'}</span>
            </div>
            <div className="mx-auto w-full max-w-[340px]">
              <TimeStepper
                value={{ y: dpy, m: dpm, d: dpd, h: dpHour, mi: dpMin }}
                units={['y', 'mo', 'd', 'h', 'mi']}
                zhMode={zhMode}
                onChange={(t) => patchParams((p) => { p.set('dpy', String(t.y)); p.set('dpm', String(t.m)); p.set('dpd', String(t.d)); p.set('dph', String(t.h)); p.set('dpmi', String(t.mi)); })}
                onNow={backToNow}
              />
            </div>
            {sky ? (
              <ChartResult chart={sky} zhMode={zhMode} hideStatus cornerActions={cornerActions} />
            ) : (
              <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
            )}
          </div>
        ) : dpMode ? (
          dyn ? (
            <DynResult
              dyn={dyn}
              zhMode={zhMode}
              target={{ year: dpy, month: dpm, day: dpd, hour: dpHour, minute: dpMin }}
              onDate={(y, m, d, h, mi) => patchParams((p) => { p.set('dpy', String(y)); p.set('dpm', String(m)); p.set('dpd', String(d)); if (h !== undefined) p.set('dph', String(h)); if (mi !== undefined) p.set('dpmi', String(mi)); })}
              onNow={backToNow}
              cornerActions={cornerActions}
            />
          ) : dynErr ? (
            <p className="mb-5 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-3 text-center text-[12px] text-[#e8a08a]">{dynErr}</p>
          ) : (
            <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
          )
        ) : bandKind ? (
          data && <BandResult chart={data} zhMode={zhMode} kind={bandKind} cornerActions={cornerActions} />
        ) : (
          data && <ChartResult chart={data} zhMode={zhMode} aspectMode={aspectMode} onAspectMode={(m) => patchParams((p) => { if (m === 'list') p.set('ag', 'list'); else p.delete('ag'); })} cornerActions={cornerActions} />
        )}
        {synOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setSynOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0b0e17]/[0.97] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
              <p className="mb-1 font-display text-[15px] tracking-[0.15em] text-accent">{zhMode ? '合盘 · 选择档案' : 'Synastry · archives'}</p>
              <p className="mb-3 text-[11px] leading-relaxed text-muted/70">{zhMode ? '选择一份档案与当下本命盘合盘 (档案保存在本机浏览器)' : 'Pick an archive; stored in this browser'}</p>
              <div className="space-y-1.5">
                {arcList.map((x) => (
                  <div
                    key={x.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] px-3 py-2 transition-colors hover:border-accent/40"
                    onClick={() => { patchParams((p) => { p.set('sync', x.id); }); setSynOpen(false); }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-frost/90">{x.label}</p>
                      <p className="text-[10.5px] text-muted/70">{x.birth.year}-{String(x.birth.month).padStart(2, '0')}-{String(x.birth.day).padStart(2, '0')} {String(x.birth.hour).padStart(2, '0')}:{String(x.birth.minute).padStart(2, '0')} · {x.birth.city ?? ''}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteArchiveSmart(x.id).then(() => loadArchivesSmart().then((r) => setArcList(r.list))); }}
                      className="ml-2 shrink-0 text-[10.5px] text-muted/50 transition-colors hover:text-[#e8a08a]"
                    >
                      {zhMode ? '删除' : 'Del'}
                    </button>
                  </div>
                ))}
                {arcList.length === 0 && <p className="py-5 text-center text-[11.5px] text-muted/60">{zhMode ? '暂无档案 — 点下方「新增档案」' : 'No archives yet'}</p>}
              </div>
              <button
                onClick={() => { setSynOpen(false); setNewArcOpen(true); }}
                className="mt-4 w-full rounded-xl border border-accent/40 py-2 text-[12px] tracking-[0.1em] text-accent transition-colors hover:bg-accent/[0.08]"
              >
                {zhMode ? '+ 新增档案' : '+ New archive'}
              </button>
            </div>
          </div>
        )}
        <EditBirth
          birth={emptyB}
          open={newArcOpen}
          onClose={() => setNewArcOpen(false)}
          archive
          onSave={(b, ex) => { saveArchiveSmart(b, ex).then(() => { loadArchivesSmart().then((r) => setArcList(r.list)); setNewArcOpen(false); setSynOpen(true); }); }}
        />
      </section>
    </PageShell>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ChartPageInner />
    </Suspense>
  );
}
