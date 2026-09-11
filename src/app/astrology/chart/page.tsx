'use client';

// ============================================================
// 独立星盘页 /astrology/chart
// 生辰全部编码在 URL → 可分享/收藏/刷新不丢; 进页即自动排盘
// 切宫制 = 改 URL = 重排盘 (URL 始终是盘面真相)
// ============================================================

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell, { SectionHead } from '@/components/PageShell';
import { useI18n } from '@/i18n';
import ChartResult from '@/components/astro/ChartResult';
import type { VChart } from '@/components/astro/ChartWheel';
import { birthFromParams } from '@/lib/astro/chart-url';
import type { HouseSystem } from '@/lib/astro/chart';

const SYSTEMS: HouseSystem[] = ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus'];
const SYS_ZH: Record<string, string> = {
  placidus: '普拉西德', koch: '科赫', equal: '等宫', 'whole-sign': '整宫',
  porphyry: '波菲里', regiomontanus: '雷吉奥', campanus: '坎帕努斯',
};

function ChartPageInner() {
  const { t, lang } = useI18n();
  const zhMode = lang !== 'en';
  const router = useRouter();
  const sp = useSearchParams();

  const birth = useMemo(() => birthFromParams(new URLSearchParams(sp.toString())), [sp]);

  const [data, setData] = useState<VChart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef('');
  const reqSeq = useRef(0);

  const cast = useCallback((sys: HouseSystem) => {
    if (!birth) return;
    const seq = ++reqSeq.current; // 竞态守卫: 只接受最后一次请求的结果
    setLoading(true); setError('');
    fetch('/api/astro/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: { ...birth, houseSystem: sys } }),
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
    // 只在生辰(非宫制)变化时自动排盘; sysKey 防同盘重复请求
    if (!birth) return;
    const key = `${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}-${birth.latitude}-${birth.longitude}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    cast(birth.houseSystem ?? 'placidus');
  }, [birth, cast]);

  const switchSystem = (sys: HouseSystem) => {
    // 直接重排盘 (不依赖 URL 变化触发); URL 仅同步地址, 失败也不影响盘面
    cast(sys);
    const next = new URLSearchParams(sp.toString());
    next.set('sys', sys);
    router.replace(`/astrology/chart?${next.toString()}`, { scroll: false });
  };

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
      <section className="mb-10 mt-8">
        <SectionHead no="01" title={t('astro.chart.section')} sub={t('astro.chart.sectionSub')} />

        {/* 宫制切换条 */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[10px] tracking-[0.25em] text-muted uppercase">{t('astro.form.system')}</span>
          {SYSTEMS.map((s) => (
            <button
              key={s}
              onClick={() => switchSystem(s)}
              className={`rounded-full border px-3 py-1 text-[11px] tracking-[0.1em] transition-colors ${
                (data?.houseSystemUsed ?? birth.houseSystem) === s
                  ? 'border-accent/50 bg-accent/[0.08] text-accent'
                  : 'border-white/[0.1] text-muted hover:border-white/25'
              }`}
            >
              {zhMode ? SYS_ZH[s] : s}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-5 rounded-xl border border-[#e8a08a]/25 bg-[#e8a08a]/[0.05] px-4 py-3 text-center text-[12px] text-[#e8a08a]">
            {error} · <button onClick={() => cast(birth.houseSystem ?? 'placidus')} className="underline">{t('astro.chart.retry')}</button>
          </p>
        )}
        {loading && !data && (
          <p className="py-20 text-center text-[12px] tracking-[0.3em] text-muted">{t('astro.form.casting')}</p>
        )}
        {data && <ChartResult chart={data} zhMode={zhMode} />}
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
