'use client';

import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getCardImage, shuffleDraw, SPREADS, type DrawnCard } from '@/lib/tarot';
import { requestInterpret, toPayload } from '@/lib/ai';
import { useI18n } from '@/i18n';
import LogoSpinner from '@/components/LogoSpinner';

/* 常用牌阵（展示精选 + 自定义入口） */
const QUICK_SPREADS = [
  { key: 'single', desc: '一张牌 · 抓当下核心' },
  { key: 'three', desc: '三张牌 · 过去现在未来' },
  { key: 'situation', desc: '五张牌 · 拆解现状局面' },
  { key: 'horseshoe', desc: '七张牌 · 完整梳理全貌' },
];

type Mode = 'pick' | 'draw' | 'loading' | 'result';

export default function DrawSection() {
  const { lang } = useI18n();
  const [spreadKey, setSpreadKey] = useState('three');
  const [customCount, setCustomCount] = useState(3);
  const [customPositions, setCustomPositions] = useState('过去,现在,未来');
  const [useCustom, setUseCustom] = useState(false);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<Mode>('pick');
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(0);
  const drawCountRef = useRef(0);

  const spread = useMemo(() => (useCustom ? null : SPREADS[spreadKey]), [spreadKey, useCustom]);
  const drawCount = useMemo(() => (useCustom ? Math.max(1, Math.min(10, customCount)) : (spread?.count ?? 1)), [spread, customCount, useCustom]);

  /* 系统随机抽牌 */
  const doDraw = () => {
    const drawn = shuffleDraw(drawCount);
    drawCountRef.current = drawCount;
    setCards(drawn);
    setRevealed(0);
    setMode('draw');
    setResult('');
    setError('');
  };

  const revealNext = () => setRevealed((r) => Math.min(r + 1, cards.length));

  /* 提交 AI 智能体解析 */
  const doInterpret = async () => {
    setMode('loading');
    setError('');
    try {
      const payload = toPayload(
        cards,
        question || '请为我解读这组牌的指引',
        useCustom ? `自定义牌阵（${customPositions}）` : spread?.name,
        useCustom ? customPositions.split(/[,，、]/).filter(Boolean) : spread?.positions,
        lang
      );
      const { narrative } = await requestInterpret(payload);
      if (!narrative) throw new Error('AI 返回内容为空');
      setResult(narrative);
      setMode('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误，请稍后重试');
      setMode('draw');
    }
  };

  const reset = () => {
    setMode('pick');
    setCards([]);
    setResult('');
    setError('');
    setRevealed(0);
    setQuestion('');
  };

  return (
    <section id="draw" className="relative mx-auto max-w-[90rem] px-8 py-36 sm:px-12">
      {/* 区块头 */}
      <div className="mb-24 text-center">
        <p className="text-xs tracking-[0.4em] text-accent/70 uppercase">Online Reading</p>
        <h2 className="font-display mt-8 text-5xl font-light tracking-[0.12em] text-frost sm:text-6xl">
          在线抽牌
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          选择牌阵，系统随机抽牌；默念你的问题，让牌为你照见当下。
        </p>
      </div>

      {mode === 'pick' && (
        <div className="mx-auto max-w-6xl">
          {/* 牌阵选择 */}
          <div className="mb-16 text-left">
            <h3 className="font-display mb-8 text-xl tracking-[0.15em] text-frost/90">一、选择牌阵</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_SPREADS.map((s) => {
                const active = !useCustom && spreadKey === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => { setUseCustom(false); setSpreadKey(s.key); }}
                    className={`rounded-2xl border p-8 text-left transition-all duration-300 ${
                      active
                        ? 'border-accent/50 bg-accent/[0.08] shadow-glow'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-accent/30'
                    }`}
                  >
                    <p className="font-display text-xl tracking-[0.12em] text-frost">
                      {SPREADS[s.key].name}
                    </p>
                    <p className="mt-3 text-[11px] tracking-[0.2em] text-accent/70 uppercase">
                      {SPREADS[s.key].count} 张牌 · {SPREADS[s.key].theme}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-muted">{s.desc}</p>
                  </button>
                );
              })}
              {/* 自定义牌阵 */}
              <button
                onClick={() => setUseCustom(true)}
                className={`rounded-2xl border border-dashed p-8 text-left transition-all duration-300 ${
                  useCustom
                    ? 'border-accent/60 bg-accent/[0.08] shadow-glow'
                    : 'border-accent/25 hover:border-accent/50'
                }`}
              >
                <p className="font-display text-xl tracking-[0.12em] text-accent">自定义牌阵</p>
                <p className="mt-3 text-[11px] tracking-[0.2em] text-muted uppercase">Custom</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">自由设置张数与牌位含义</p>
              </button>
            </div>
          </div>

          {/* 自定义参数 */}
          {useCustom && (
            <div className="rounded-2xl border border-accent/20 bg-white/[0.02] p-10 mb-12">
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm text-muted">抽牌张数（1-10）</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={customCount}
                    onChange={(e) => setCustomCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost focus:border-accent/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm text-muted">牌位含义（逗号分隔）</label>
                  <input
                    value={customPositions}
                    onChange={(e) => setCustomPositions(e.target.value)}
                    placeholder="例如：现状,阻碍,建议"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost focus:border-accent/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 问题输入 + 开始 */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10">
            <label className="mb-4 block text-sm text-muted">二、默念你的问题（可选）</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：这段关系接下来会如何发展？越具体，牌看得越清楚。"
              maxLength={200}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
            />
            <button
              onClick={doDraw}
              className="liquid-glass-strong mt-8 w-full rounded-full py-5 text-base tracking-[0.25em] text-frost transition-all hover:bg-white/[0.03] sm:w-auto sm:px-16"
            >
              三、开始抽牌
            </button>
          </div>
        </div>
      )}

      {mode === 'draw' && (
        <div className="mx-auto max-w-6xl">
          <h3 className="font-display mb-12 text-center text-xl tracking-[0.15em] text-frost/90">
            已抽 {cards.length} 张 · 点击翻开
          </h3>

          {/* 卡面：正面 = 卡背样式，翻开 = 牌面 */}
          <div className="flex flex-wrap justify-center gap-10">
            {cards.map((c, i) => {
              const flipped = i < revealed;
              return (
                <button
                  key={`${c.id}-${i}`}
                  onClick={revealNext}
                  disabled={flipped}
                  className="group relative"
                  aria-label={flipped ? c.name : `翻开第 ${i + 1} 张牌`}
                >
                  <div className={`h-60 w-40 overflow-hidden rounded-xl border transition-all duration-700 [transform-style:preserve-3d] sm:h-72 sm:w-44 ${flipped ? '[transform:rotateY(180deg)]' : 'group-hover:-translate-y-3'}`}>
                    {/* 背面（鎏金卡背） */}
                    <div className={`absolute inset-0 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-[#1c1912] to-[#080807] ${flipped ? '[backface-visibility:hidden]' : ''}`}>
                      <img src="/cards/card-back-new.webp" alt="" draggable={false} className="h-full w-full object-cover" />
                      <span className="tarot-scene-card-sheen !inset-[-40%]" aria-hidden="true" />
                    </div>
                    {/* 正面（牌面） */}
                    <div className={`absolute inset-0 overflow-hidden rounded-xl border border-accent/30 ${flipped ? '' : '[backface-visibility:hidden] [transform:rotateY(180deg)]'}`}>
                      <img src={getCardImage(c.id)} alt={c.name} className={`h-full w-full object-cover ${c.isReversed ? 'rotate-180' : ''}`} />
                      <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-accent-soft">
                        {c.isReversed ? '逆位' : '正位'}
                      </span>
                    </div>
                  </div>
                  <p className="font-display mt-5 text-center text-sm tracking-[0.12em] text-frost">
                    {flipped ? c.name : '✦'}
                  </p>
                  {flipped && (
                    <p className="mt-2 text-center text-xs text-muted">
                      {spread?.positions?.[i] ?? (useCustom ? customPositions.split(/[,，、]/).filter(Boolean)[i] ?? '' : '')}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-16 flex flex-col items-center justify-center gap-6 sm:flex-row">
            {revealed < cards.length ? (
              <button onClick={revealNext} className="liquid-glass rounded-full px-12 py-4 text-sm tracking-[0.2em] text-frost">
                翻开下一张（{revealed}/{cards.length}）
              </button>
            ) : (
              <button onClick={doInterpret} className="liquid-glass-strong rounded-full px-12 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.03]">
                提交给 AI 智能体深度解读 →
              </button>
            )}
            <button onClick={reset} className="liquid-glass rounded-full px-10 py-4 text-sm tracking-[0.12em] text-muted">
              ← 重新抽牌
            </button>
          </div>
        </div>
      )}

      {mode === 'loading' && (
        <div className="mx-auto flex max-w-xl flex-col items-center py-28 text-center">
          <LogoSpinner size={80} />
          <p className="font-display mt-10 text-lg tracking-[0.2em] text-frost/90">智能体正在解读中…</p>
          <p className="mt-4 text-sm text-muted">融合元素 · 灵数 · 占星关联，为你展开深度解析</p>
        </div>
      )}

      {mode === 'result' && (
        <div className="mx-auto max-w-4xl">
          <h3 className="font-display mb-12 text-center text-xl tracking-[0.15em] text-frost/90">解读结果</h3>
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-sm text-red-400">{error}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none rounded-2xl border border-accent/15 bg-black/30 p-12 text-left leading-relaxed text-muted [&_h1]:mb-6 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-frost [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-frost [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-frost [&_li]:ml-6 [&_li]:list-disc [&_p]:mb-4 [&_strong]:text-frost">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
          <div className="mt-12 text-center">
            <button onClick={reset} className="liquid-glass rounded-full px-12 py-4 text-sm tracking-[0.15em] text-frost">
              再抽一次
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
