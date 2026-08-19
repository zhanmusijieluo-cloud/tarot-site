'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';
import { SPREADS, type Spread } from '@/lib/tarot';

export default function SpreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const spread = SPREADS[params.key];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!spread) router.replace('/spreads');
  }, [spread, router]);

  if (!spread) return null;

  return (
    <PageShell
      label={spread.theme.toUpperCase()}
      title={spread.name}
      subtitle={spread.subtitle}
      footer={
        <button
          onClick={() => router.push('/online')}
          className="glass-btn-primary text-xs tracking-[0.25em]"
        >
          立即使用 →
        </button>
      }
    >
      <Reveal className="mt-8">
        <p className="text-sm leading-relaxed text-muted">{spread.description}</p>
      </Reveal>

      <Reveal delay={200}>
        <SectionHead no="01" title={`牌阵结构 · ${spread.count} 张`} sub="每一张牌对应一个问题维度" />
        <div className="mt-6 space-y-2">
          {spread.positions.map((pos, i) => (
            <div
              key={i}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                activeIdx === i
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <span className="font-display text-sm font-light text-accent/70 w-8">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-sm text-frost">{pos}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-muted transition-transform duration-200" style={{ transform: activeIdx === i ? 'rotate(180deg)' : 'none' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          ))}
        </div>
      </Reveal>
    </PageShell>
  );
}

function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-xs tracking-[0.3em] text-accent/70">{no}</span>
        <h2 className="font-display text-lg font-light tracking-[0.12em] text-frost">{title}</h2>
        <span className="hairline-glow flex-1" />
      </div>
      {sub && <p className="mt-2 pl-9 text-xs text-muted">{sub}</p>}
    </div>
  );
}
