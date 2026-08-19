'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { SPREADS, SPREAD_THEMES, type Spread } from '@/lib/tarot';

const FILTERS = [
  { key: 'all', name: '全部' },
  { key: 'general', name: '综合' },
  { key: 'love', name: '感情' },
  { key: 'career', name: '事业' },
  { key: 'wealth', name: '财富' },
  { key: 'choice', name: '抉择' },
  { key: 'growth', name: '成长' },
];

export default function SpreadsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const themeLabels = SPREAD_THEMES;
  const spreads = Object.entries(SPREADS).filter(([, s]) => filter === 'all' || s.theme === filter);

  return (
    <PageShell
      label="Spreads · Selection"
      title="推荐牌阵"
      subtitle="根据问题类型，选择最合适的牌阵"
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          选择适合你的牌阵，让问题在牌阵中清晰显现
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
            {f.name}
          </button>
        ))}
      </Reveal>

      {/* 牌阵列表 */}
      <section className="mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spreads.map(([key, spread], i) => {
            const theme = themeLabels[spread.theme];
            return (
              <Reveal key={key} delay={(i % 3) * 80}>
                <button
                  onClick={() => router.push(`/online?spread=${key}`)}
                  className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                      {theme?.name || spread.theme}
                    </span>
                    <span className="text-[10px] tracking-[0.2em] text-muted/60">
                      {spread.count} 张
                    </span>
                  </div>
                  <h3 className="font-display mt-2.5 text-base tracking-[0.1em] text-frost">
                    {spread.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{spread.subtitle}</p>
                  <p className="mt-3 text-[12px] leading-relaxed text-muted/90">
                    {spread.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {spread.positions.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[10px] text-muted/80"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 自定义入口 */}
      <Reveal>
        <button
          onClick={() => router.push('/online/custom')}
          className="group mt-6 flex w-full items-center gap-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-5 transition-all duration-300 hover:border-accent/40 hover:bg-accent/[0.05]"
        >
          <span className="text-xl">✦</span>
          <div className="text-left">
            <span className="font-display text-sm tracking-[0.2em] text-frost">
              自定义牌阵
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              自由设定选牌数量、每张牌的问题与所问之事
            </span>
          </div>
          <span className="ml-auto text-muted/70 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
      </Reveal>
    </PageShell>
  );
}
