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
      body: JSON.stringify({ birth: { ...birth, houseSystem: birth.houseSystem ?? 'placidus' }, settings, type: dynType, target: { year: dpy, month: dpm, day: dpd } }),
    })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'failed'); if (alive) setDyn(j.chart as DynamicChart); })
      .catch((e) => { if (alive) setDynErr(e instanceof Error ? e.message : t('astro.form.failed')); });
    return () => { alive = false; };
  }, [birth, settings, dynType, dpy, dpm, dpd, t]);


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
  const cornerActions = (
    <>
      <button
        onClick={() => setEditOpen(true)}
        title={t('astro.edit.hint')}
        className="flex w-full items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0a0e19]/90 px-3.5 py-[9px] text-left text-[11.5px] text-frost/75 shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent"
      >
        <span className="text-[12px]">✎</span> {t('astro.edit.btn')}
      </button>
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
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
          {([
            ['', zhMode ? '本命盘' : 'Natal'],
            ['t', zhMode ? '三限盘' : 'Tertiary'],
            ['s', zhMode ? '次限盘' : 'Secondary'],
            ['tr', zhMode ? '行运盘' : 'Transit'],
            ['sr', zhMode ? '日返盘' : 'Solar Return'],
            ['lr', zhMode ? '月返盘' : 'Lunar Return'],
            ['arc', zhMode ? '日弧' : 'Solar Arc'],
            ['sky', zhMode ? '天象盘' : 'Sky'],
            ['fir', zhMode ? '法达' : 'Firdaria'],
          ] as [string, string][]).map(([key, label]) => {
            const disabled = key === 'sky' || key === 'fir';
            const active = dpKey === key;
            return (
              <button
                key={key || 'natal'}
                aria-disabled={disabled || undefined}
                title={disabled ? `${label} · ${zhMode ? '开发中, 敬请期待' : 'in development'}` : undefined}
                onClick={() => {
                  if (disabled) return;
                  patchParams((p) => {
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
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11.5px] text-muted lg:hidden">
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
        {dpMode ? (
          dyn ? (
            <DynResult
              dyn={dyn}
              zhMode={zhMode}
              target={{ year: dpy, month: dpm, day: dpd }}
              onDate={(y, m, d) => patchParams((p) => { p.set('dpy', String(y)); p.set('dpm', String(m)); p.set('dpd', String(d)); })}
              cornerActions={cornerActions}
            />
          ) : dynErr ? (
            <p className="mb-5 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-3 text-center text-[12px] text-[#e8a08a]">{dynErr}</p>
          ) : (
            <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
          )
        ) : (
          data && <ChartResult chart={data} zhMode={zhMode} aspectMode={aspectMode} onAspectMode={(m) => patchParams((p) => { if (m === 'list') p.set('ag', 'list'); else p.delete('ag'); })} cornerActions={cornerActions} />
        )}
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
