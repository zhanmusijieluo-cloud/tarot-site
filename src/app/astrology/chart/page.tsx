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
import ChartSettings from '@/components/astro/ChartSettings';
import type { VChart } from '@/components/astro/ChartWheel';
import { birthFromParams, settingsFromParams, settingsToParams } from '@/lib/astro/chart-url';
import { HOUSE_SYSTEM_ZH, type BirthData, type CastSettings, type HouseSystem } from '@/lib/astro/chart';

const SYS_ZH = HOUSE_SYSTEM_ZH;

function ChartPageInner() {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();
  const sp = useSearchParams();

  const birth = useMemo(() => birthFromParams(new URLSearchParams(sp.toString())), [sp]);
  const settings = useMemo(() => settingsFromParams(new URLSearchParams(sp.toString())) ?? {}, [sp]);
  const aspectMode = (sp.get('ag') === 'grid' ? 'grid' : 'list') as 'list' | 'grid';

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

  return (
    <PageShell
      label={t('page.astrology.label')}
      title={t('astro.chart.title')}
      subtitle={t('astro.chart.sub')}
      wide
    >
      <section className="mb-10 mt-6">
        {/* 身份一行 (学宫神星资料卡压缩版): 档案名 · 生辰 · 地点 · 宫制(点开设置) · ⚙ */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
          {birth.label && <span className="font-display text-[13px] tracking-[0.1em] text-accent">{birth.label}</span>}
          {birth.label && <span className="text-muted/30">·</span>}
          <span>
            {birth.year}-{birth.month}-{birth.day}{' '}
            {birth.timeKnown === false ? t('astro.res.noTime') : `${String(birth.hour).padStart(2, '0')}:${String(birth.minute ?? 0).padStart(2, '0')}`}
          </span>
          <span className="text-muted/30">·</span>
          <span>{birth.cnCode ? birth.cnCode.split('~').join(' ') : birth.city ?? ''}</span>
          <span className="text-muted/30">·</span>
          <button
            onClick={() => openSettings('houses')}
            className="rounded-full border border-white/[0.12] px-2.5 py-0.5 text-[10.5px] text-frost/75 transition-colors hover:border-accent/40 hover:text-accent"
            title={t('astro.set.houseHint')}
          >
            {zhMode ? (SYS_ZH[data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus'] ?? data?.houseSystemUsed ?? '普拉西德') : (data?.houseSystemUsed ?? birth.houseSystem ?? 'placidus')}
            <span className="ml-1 text-[8px] text-muted/60">▾</span>
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
        {data && <ChartResult chart={data} zhMode={zhMode} aspectMode={aspectMode} onAspectMode={(m) => patchParams((p) => { if (m === 'grid') p.set('ag', 'grid'); else p.delete('ag'); })} />}
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
