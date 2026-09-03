'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Sparkles, User, HelpCircle } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import { SPREADS, type Spread } from '@/lib/tarot';
import { solveSpreadLayout, getCrossIdx, CARD_H_RATIO, cardWClassToPx } from '@/lib/spread-layout';
import { spreadSubtitle, spreadDescription, spreadPositions } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';

const CARD_BACK = '/cards/card-back-new.webp';

/**
 * 牌阵详情 · 问问题页
 * ① 牌阵布局预览（卡背 + 序号 + 牌位名，与解读室实际摆放一致）
 * ② 每张牌对应的问题解释 + 适用场景总结
 * ③ 问题 + 背景输入 → 带参进入 /online 直接抽牌
 */
function SpreadDetailInner() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const params = useParams<{ key: string }>();
  const searchParams = useSearchParams();
  const spread: Spread | undefined = SPREADS[params.key];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');

  const n = spread?.count ?? 1;
  // 运行时几何求解：测容器实际宽度 → 精确算出容器高与卡宽（无溢出/留白）
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutW, setLayoutW] = useState(0);
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const update = () => setLayoutW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const solved = solveSpreadLayout(params.key, n, layoutW || 672);
  const coords = solved.coords;
  const cardWClass = solved.cardW;
  const cardWPx = cardWClassToPx(cardWClass);
  // 横置交叉牌：直接使用横向尺寸（宽=竖高、高=竖宽），
  // 避免 rotate(90deg) 导致布局占位（竖）与视觉（横）不一致，牌下方出现留白
  const crossIdx = getCrossIdx(params.key, n);

  const start = () => {
    if (!question.trim()) return;
    const q = encodeURIComponent(question.trim());
    const bg = encodeURIComponent(background.trim());
    router.push(`/online?spread=${params.key}&q=${q}&bg=${bg}`);
  };

  if (!spread) {
    return (
      <PageShell label={t('page.spreads.label')} title={t('page.spreads.title')}>
        <Reveal className="flex justify-center py-16">
          <button onClick={() => router.push('/spreads')} className="glass-btn-primary text-xs">
            {t('session.empty.cta')} →
          </button>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell
      label={t(`spreadTheme.${spread.theme}`)}
      title={t(`spread.${params.key}`)}
      subtitle={spreadSubtitle(params.key, spread.subtitle, lang, t)}
    >
      {/* ═══ ① 牌阵布局预览：卡背 + 序号 + 牌位名（与解读室摆放一致） ═══ */}
      <Reveal className="mt-8">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 sm:px-7 sm:py-12">
          <div ref={layoutRef} className="relative mx-auto w-full max-w-2xl" style={{ height: layoutW ? solved.height : undefined, minHeight: layoutW ? undefined : 200 }}>
            {coords.slice(0, n).map((p, idx) => {
              const isCross = idx === crossIdx;
              return (
                <div key={idx} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <button
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`position ${idx + 1}`}
                    className={`relative block rounded-md transition-all duration-300 ${
                      isCross
                        ? activeIdx === idx
                          ? 'z-10 ring-1 ring-accent/80 shadow-lg shadow-accent/25'
                          : 'opacity-95 hover:opacity-100'
                        : activeIdx === idx
                          ? 'z-10 scale-[1.12] ring-1 ring-accent/80 shadow-lg shadow-accent/25'
                          : 'opacity-95 hover:scale-[1.06] hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`overflow-hidden rounded-md shadow-md shadow-black/50 ${isCross ? '' : cardWClass}`}
                      style={
                        isCross
                          ? { width: Math.round(cardWPx * CARD_H_RATIO), height: cardWPx }
                          : { aspectRatio: '2 / 3.4' }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={CARD_BACK} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    {/* 序号圆点（与解读室一致） */}
                    <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium text-black">
                      {idx + 1}
                    </span>
                  </button>
                  {/* 牌位名称（跟随站点语言） */}
                  <p className="mx-auto mt-1.5 max-w-[5.5rem] truncate text-center text-[10px] leading-tight text-accent/75">
                    {spreadPositions(params.key, spread.positions, lang, t)[idx]}
                  </p>
                </div>
              );
            })}
          </div>
          {/* 点击牌位提示 */}
          <p className="mt-8 text-center text-[11px] text-muted/60">{t('spreadDetail.tapHint')}</p>
        </div>
      </Reveal>

      {/* ═══ ② 适用场景总结 ═══ */}
      <Reveal delay={120}>
        <SectionHead no="01" title={t('spreadDetail.suitableTitle')} sub={undefined} />
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
          <p className="text-sm leading-relaxed text-muted">{spreadDescription(params.key, spread.description, lang, t)}</p>
        </div>
      </Reveal>

      {/* ═══ ③ 问题 + 背景输入 ═══ */}
      <Reveal delay={280}>
        <SectionHead no="02" title={t('spreadDetail.questionTitle')} sub={t('spreadDetail.questionSub')} />
      </Reveal>
      <Reveal delay={340}>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
              <HelpCircle className="h-4 w-4" />
            </span>
            <label htmlFor="spread-question" className="font-display text-sm tracking-[0.2em] text-frost">
              {t('quick.questionLabel')}
            </label>
          </div>
          <textarea
            id="spread-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('quick.questionPlaceholder')}
            maxLength={120}
            rows={4}
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
          />
          <p className="mt-2 text-right text-[11px] text-muted/60">{question.length} / 120</p>
        </div>
      </Reveal>
      <Reveal delay={400}>
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
              <User className="h-4 w-4" />
            </span>
            <label htmlFor="spread-background" className="font-display text-sm tracking-[0.2em] text-frost">
              {t('quick.bgLabel')}
            </label>
          </div>
          <textarea
            id="spread-background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder={t('quick.bgPlaceholder')}
            maxLength={300}
            rows={5}
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
          />
          <p className="mt-2 text-right text-[11px] text-muted/60">{background.length} / 300</p>
        </div>
      </Reveal>

      <Reveal delay={480}>
        <div className="mt-8 flex flex-col items-center gap-4 pb-4">
          <button
            onClick={start}
            disabled={!question.trim()}
            className={`glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12 ${
              !question.trim() ? 'opacity-40' : ''
            }`}
          >
            <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
            {t('quick.start')}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-muted/60">
            {t('spreadDetail.hint', { count: spread.count })}
          </p>
        </div>
      </Reveal>
    </PageShell>
  );
}

export default function SpreadDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <SpreadDetailInner />
    </Suspense>
  );
}

function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 pt-12">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-xs tracking-[0.3em] text-accent/70">{no}</span>
        <h2 className="font-display text-lg font-light tracking-[0.12em] text-frost">{title}</h2>
        <span className="hairline-glow flex-1" />
      </div>
      {sub && <p className="mt-2 pl-9 text-xs text-muted">{sub}</p>}
    </div>
  );
}
