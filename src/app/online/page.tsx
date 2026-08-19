'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import TarotScene from '@/components/TarotScene';
import { TAROT_DECK, shuffleDraw, SPREADS, getCardImage, type DrawnCard, type Spread } from '@/lib/tarot';
import { getMcpClient } from '@/mcp/client';

type Stage = 'catalogue' | 'shuffle' | 'draw' | 'reveal' | 'result-loading' | 'result';

const SPREAD_OPTIONS = [
  { id: 'single', name: '单牌指引', count: 1, subtitle: '抓住此刻最重要的一点', theme: 'general' },
  { id: 'three', name: '三牌时间流', count: 3, subtitle: '看过去、现在和未来', theme: 'general' },
  { id: 'situation', name: '现状解局', count: 5, subtitle: '拆开表面与隐藏因素', theme: 'general' },
  { id: 'horseshoe', name: '七牌马蹄阵', count: 7, subtitle: '完整梳理问题全貌', theme: 'general' },
  { id: 'celtic', name: '凯尔特十字', count: 10, subtitle: '深入复杂问题的根源', theme: 'general' },
];

export default function OnlinePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('catalogue');
  const [selectedSpread, setSelectedSpread] = useState('three');
  const [question, setQuestion] = useState('');
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [interpretation, setInterpretation] = useState('');
  const [error, setError] = useState('');
  const deckRef = useRef<number[]>([]);
  const selectedRef = useRef<Set<number>>(new Set());

  const spread: Spread | null = useMemo(
    () => selectedSpread === 'custom' ? null : SPREADS[selectedSpread],
    [selectedSpread]
  );
  const drawCount = useMemo(() => spread?.count ?? 1, [spread]);

  // 洗牌阶段：点击洗牌
  const doShuffle = () => {
    deckRef.current = [...TAROT_DECK].map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, drawCount);
    selectedRef.current.clear();
    setCards([]);
    setRevealedIdx(-1);
    setStage('draw');
  };

  // 选牌
  const toggleCard = (id: number) => {
    const s = selectedRef.current;
    if (s.has(id)) s.delete(id);
    else if (s.size < drawCount) s.add(id);
    setCards([...s].map((uid) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: false } as DrawnCard;
    }));
    setRevealedIdx(-1);
  };

  // 进入解读
  const doReveal = () => {
    const drawn = deckRef.current.map((uid) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: Math.random() < 0.5 } as DrawnCard;
    });
    setCards(drawn);
    setRevealedIdx(0);
    setStage('reveal');
  };

  // 翻下一张
  const nextCard = () => {
    setRevealedIdx((i) => {
      const next = i + 1;
      if (next >= cards.length) return i;
      return next;
    });
  };

  // 解读
  const doInterpret = async () => {
    setStage('result-loading');
    setError('');
    try {
      const client = getMcpClient();
      const result = await client.readTarot({
        cards: cards.map((c) => ({
          id: c.id,
          name: c.name,
          isReversed: c.isReversed,
          upright: c.upright,
          element: c.element,
          zodiac: c.zodiac,
        })),
        question,
        spreadName: spread?.name ?? '单牌',
        positions: spread?.positions ?? ['核心指引'],
      });
      if (result.success && result.narrative) {
        setInterpretation(result.narrative);
      } else {
        setError(result.error ?? '解读失败，请稍后重试');
      }
    } catch (e: any) {
      setError(e?.message ?? '网络错误');
    } finally {
      setStage('result');
    }
  };

  const reset = () => {
    setStage('catalogue');
    setCards([]);
    setRevealedIdx(-1);
    setInterpretation('');
    setError('');
    setQuestion('');
  };

  return (
    <PageShell
      label="Online · Divination"
      title="开始占卜"
      subtitle="把心里那件事，问出来。越具体，牌看得越清楚。"
    >
      {/* 目录 */}
      {stage === 'catalogue' && (
        <section>
          <Reveal>
            <h2 className="font-display text-lg tracking-[0.15em] text-frost/90 mb-6">
              ✦ 选择牌阵
            </h2>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SPREAD_OPTIONS.map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <button
                  onClick={() => setSelectedSpread(s.id)}
                  className={`group h-full w-full rounded-2xl border p-5 text-left transition-all duration-300 ${
                    selectedSpread === s.id
                      ? 'border-accent/50 bg-accent/15'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                      {s.theme === 'love' ? '💕' : s.theme === 'career' ? '💼' : '✦'} · {s.count} 张
                    </span>
                  </div>
                  <h3 className="font-display mt-2 text-base tracking-[0.1em] text-frost">{s.name}</h3>
                  <p className="mt-1 text-xs text-muted">{s.subtitle}</p>
                </button>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <button
              onClick={() => router.push('/online/custom')}
              className="mt-4 flex items-center gap-2 rounded-full border border-dashed border-white/[0.1] px-4 py-2.5 text-sm text-muted transition-all hover:border-accent/40 hover:text-frost"
            >
              <span>✦</span> 自定义牌阵
            </button>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="静心默念你的问题…"
                maxLength={60}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
              />
              <button
                onClick={doShuffle}
                className="glass-btn-primary whitespace-nowrap text-sm tracking-[0.2em]"
              >
                开始占卜
              </button>
            </div>
          </Reveal>
        </section>
      )}

      {/* 洗牌 */}
      {stage === 'shuffle' && (
        <section className="flex flex-col items-center py-16">
          <Reveal>
            <div className="text-center">
              <span className="font-display text-3xl text-frost">🔮</span>
              <p className="mt-4 text-sm text-muted">正在洗牌…</p>
            </div>
            <div className="mt-8 flex justify-center">
              <div className="relative h-32 w-48">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-lg border border-white/[0.1] bg-white/[0.03]"
                    style={{
                      transform: `translateY(${i * 4}px) rotate(${(i - 2) * 2}deg)`,
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={doReveal}
              className="mt-10 glass-btn-primary text-sm tracking-[0.2em]"
            >
              抽取 {drawCount} 张牌
            </button>
          </Reveal>
        </section>
      )}

      {/* 抽牌场景 */}
      {stage === 'draw' && (
        <section className="py-6">
          <Reveal>
            <div className="mb-4 text-center">
              <p className="text-sm text-muted">从 {drawCount} 张牌中选择</p>
              <p className="mt-1 font-display text-lg tracking-[0.15em] text-frost">
                已选 {selectedRef.current.size} / {drawCount}
              </p>
            </div>
            <div className="tarot-scene-host">
              <TarotScene
                maxSelect={drawCount}
                selectedIds={cards.map((c) => c.id)}
                onToggleCard={toggleCard}
                disabled={selectedRef.current.size >= drawCount}
              />
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setStage('catalogue')}
                className="glass-btn text-sm"
              >
                ← 返回
              </button>
              <button
                onClick={doReveal}
                disabled={selectedRef.current.size < drawCount}
                className={`glass-btn-primary text-sm ${selectedRef.current.size < drawCount ? 'opacity-40' : ''}`}
              >
                翻牌 →
              </button>
            </div>
          </Reveal>
        </section>
      )}

      {/* 翻牌 */}
      {stage === 'reveal' && cards.length > 0 && (
        <section className="py-6">
          <Reveal>
            <h2 className="font-display text-lg tracking-[0.15em] text-frost/90 mb-6 text-center">
              ✦ 牌阵结果
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {cards.map((card, i) => (
                  <div key={i} className="mb-4">
                    <div
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-500"
                      style={{
                        opacity: i <= revealedIdx ? 1 : 0.3,
                        transform: i <= revealedIdx ? 'translateY(0)' : 'translateY(10px)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{card.emoji}</span>
                        <div className="flex-1 text-left">
                          <p className="font-display text-sm tracking-[0.1em] text-frost">
                            {card.name}
                          </p>
                          <p className="text-xs text-muted">
                            {card.isReversed ? '逆位' : '正位'} · {card.element} · {card.zodiac}
                          </p>
                          {i <= revealedIdx && (
                            <p className="mt-2 text-[12px] leading-relaxed text-muted/90">{card.upright}</p>
                          )}
                        </div>
                        <span className="text-[10px] tracking-[0.2em] text-muted/60 uppercase">
                          {spread?.positions[i] ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              {revealedIdx < cards.length - 1 && (
                <button onClick={nextCard} className="glass-btn-primary text-sm">
                  下一张 →
                </button>
              )}
              {revealedIdx === cards.length - 1 && (
                <button onClick={doInterpret} className="glass-btn-primary text-sm">
                  开始解读 ✦
                </button>
              )}
              <button onClick={reset} className="glass-btn text-sm">
                ← 重新占卜
              </button>
            </div>
          </Reveal>
        </section>
      )}

      {/* 解读中 */}
      {stage === 'result-loading' && (
        <section className="flex flex-col items-center py-20">
          <Reveal>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl" />
              <span className="relative text-4xl animate-[float_2s_ease-in-out_infinite]">🔮</span>
            </div>
            <p className="mt-6 text-sm text-muted">智能塔罗师正在解读…</p>
          </Reveal>
        </section>
      )}

      {/* 结果 */}
      {stage === 'result' && (
        <section className="py-6">
          <Reveal>
            <h2 className="font-display text-lg tracking-[0.15em] text-frost/90 mb-6 text-center">
              ✦ 解读结果
            </h2>
            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            ) : interpretation ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <div
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
                  dangerouslySetInnerHTML={{ __html: interpretation }}
                />
              </div>
            ) : null}
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={reset} className="glass-btn text-sm">
                重新占卜
              </button>
            </div>
          </Reveal>
        </section>
      )}
    </PageShell>
  );
}
