'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { SPREADS, SPREAD_THEMES, type Spread } from '@/lib/tarot';
import { spreadSubtitle, spreadDescription, spreadPositions } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';

const FILTERS = [
  { key: 'all', nameKey: 'spreads.filterAll' },
  { key: 'general', nameKey: 'spreadTheme.general' },
  { key: 'love', nameKey: 'spreadTheme.love' },
  { key: 'career', nameKey: 'spreadTheme.career' },
  { key: 'wealth', nameKey: 'spreadTheme.wealth' },
  { key: 'choice', nameKey: 'spreadTheme.choice' },
  { key: 'growth', nameKey: 'spreadTheme.growth' },
];

export default function SpreadsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState('all');

  const themeLabels = SPREAD_THEMES;
  const spreads = Object.entries(SPREADS).filter(([, s]) => filter === 'all' || s.theme === filter);

  return (
    <PageShell
      label={t('page.spreads.label')}
      title={t('page.spreads.title')}
      subtitle={t('page.spreads.subtitle')}
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          {t('page.spreads.footer')}
        </p>
      }
    >
      {/* 筛选 */}
      <Reveal className="mb-8 mt-12 flex flex-wrap gap-2 sm:mt-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 text-xs tracking-[0.15em] transition-all duration-300 ${
              filter === f.key
                ? 'border-accent/50 bg-accent/15 text-frost'
                : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.18] hover:text-frost'
            }`}
          >
            {t(f.nameKey)}
          </button>
        ))}
      </Reveal>

      {/* 牌阵列表 */}
      <section className="mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* 自定义牌阵：置顶第一项，点击进入布阵页 */}
          <Reveal>
            <button
              onClick={() => router.push('/online/custom')}
              className="group h-full w-full rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] p-5 text-left transition-all duration-300 hover:border-accent/70 hover:bg-accent/[0.08]"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                  ✦ · {t('online.customSpreadCount')}
                </span>
              </div>
              <h3 className="font-display mt-2.5 text-base tracking-[0.1em] text-frost">
                {t('spreads.customSpread')}
              </h3>
              <p className="mt-1 text-xs text-muted">{t('spreads.customDesc')}</p>
            </button>
          </Reveal>
          {spreads.map(([key, spread], i) => {
            const theme = themeLabels[spread.theme];
            return (
              <Reveal key={key} delay={(i % 3) * 80}>
                <div
                  onClick={() => router.push(`/online/spread/${key}`)}
                  className="group h-full w-full cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                      {t(`spreadTheme.${spread.theme}`) || theme?.name || spread.theme}
                    </span>
                    <span className="text-[10px] tracking-[0.2em] text-muted/60">
                      {t('common.cardsCount', { count: spread.count })}
                    </span>
                  </div>
                  <h3 className="font-display mt-2.5 text-base tracking-[0.1em] text-frost">
                    {t(`spread.${key}`)}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{spreadSubtitle(key, spread.subtitle, lang, t)}</p>
                  <p className="mt-3 text-[12px] leading-relaxed text-muted/90">
                    {spreadDescription(key, spread.description, lang, t)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {spreadPositions(key, spread.positions, lang, t).map((p) => (
                      <span key={p} className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[10px] text-muted/80">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
          <Reveal>
            <button
              onClick={() => router.push('/offline')}
              className="flex h-full w-full cursor-pointer flex-col rounded-2xl border border-dashed border-accent/30 p-5 text-left transition-all duration-300 hover:border-accent/60 hover:bg-accent/[0.04]"
            >
              <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">自定义</span>
              <h3 className="font-display mt-2.5 text-base tracking-[0.1em] text-accent">自定义牌阵</h3>
              <p className="mt-1 text-xs text-muted">自由设置张数与牌位含义</p>
              <p className="mt-3 text-[12px] leading-relaxed text-muted/90">自定张数（1-10）、自定牌位，填入你线下摆好的牌，AI 深度解读。</p>
              <span className="mt-4 text-xs tracking-[0.15em] text-accent/80">线下抽牌 · 去填牌 →</span>
            </button>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
