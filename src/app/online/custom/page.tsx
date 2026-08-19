'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';

export default function CustomPage() {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [positions, setPositions] = useState<string[]>(
    Array.from({ length: 3 }, (_, i) => `第${i + 1}张`)
  );
  const [question, setQuestion] = useState('');

  const updatePosition = (i: number, val: string) => {
    const next = [...positions];
    next[i] = val;
    setPositions(next);
  };

  const startReading = () => {
    const pos = encodeURIComponent(positions.join('|'));
    router.push(`/online?spread=custom&count=${count}&pos=${pos}&q=${encodeURIComponent(question)}`);
  };

  return (
    <PageShell
      label="Custom · Spread"
      title="自定义牌阵"
      subtitle="自由设定选牌数量、每张牌的问题与所问之事"
    >
      <Reveal className="mt-8 space-y-6">
        {/* 选牌数量 */}
        <div>
          <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
            选牌数量（1–10）
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setCount(n);
                  setPositions(Array.from({ length: n }, (_, i) => `第${i + 1}张`));
                }}
                className={`h-10 w-10 rounded-full text-sm transition-all duration-200 ${
                  count === n
                    ? 'border-accent/50 bg-accent/15 text-frost'
                    : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.18]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 每张牌对应的问题 */}
        <div>
          <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
            每张牌对应的问题
          </label>
          <div className="space-y-2">
            {positions.map((p, i) => (
              <input
                key={i}
                value={p}
                onChange={(e) => updatePosition(i, e.target.value)}
                maxLength={20}
                placeholder={`第${i + 1}张牌的问题（可留空）`}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none"
              />
            ))}
          </div>
        </div>

        {/* 所问问题 */}
        <div>
          <label className="mb-3 block text-xs tracking-[0.2em] text-muted uppercase">
            所问问题（可选）
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={60}
            placeholder="静心默念你的问题…"
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost placeholder:text-muted/40 focus:border-accent/40 focus:outline-none resize-none"
          />
        </div>

        {/* 预览 */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-2 text-xs tracking-[0.2em] text-muted uppercase">牌阵预览</p>
          <div className="flex flex-wrap gap-2">
            {positions.map((p, i) => (
              <span
                key={i}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-muted"
              >
                {p || `第${i + 1}张`}
              </span>
            ))}
          </div>
        </div>

        {/* 开始占卜 */}
        <button
          onClick={startReading}
          className="glass-btn-primary w-full text-center text-sm tracking-[0.2em]"
        >
          开始占卜 →
        </button>
      </Reveal>
    </PageShell>
  );
}
