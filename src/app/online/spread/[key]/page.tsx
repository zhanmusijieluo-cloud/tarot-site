'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Sparkles, User, HelpCircle } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import { SPREADS, type Spread } from '@/lib/tarot';
import { solveSpreadLayout, getCrossIdx, CARD_H_RATIO, cardWClassToPx } from '@/lib/spread-layout';
import { spreadSubtitle, spreadDescription, spreadPositions } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';

const CARD_BACK = '/cards/card-back-new.webp';

/**
 * 牌阵详情 · 一条龙两步
 * Step ① 布局预览 + 适用说明 + 问题/背景 + 【开始抽牌 / 我已抽牌】
 * Step ② （我已抽牌）同一页内嵌逐张填牌（不再出现问题背景、不再跳页）→ 【开始解读】进解读室
 */
function SpreadDetailInner() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const params = useParams<{ key: string }>();
  const searchParams = useSearchParams();
  const spread: Spread | undefined = SPREADS[params.key];
  const [step, setStep] = useState<'setup' | 'offline'>('setup');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');

  const n = spread?.count ?? 1;
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutW, setLayoutW] = useState(672);
  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      // 只采纳有效宽度（>50 且有限），避免往返切换时测量闪成 0/小值导致布局塌成一坨
      if (w > 50 && Number.isFinite(w)) setLayoutW(Math.round(w));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const solved = solveSpreadLayout(params.key, n, layoutW || 672);
  const coords = solved.coords;
  const cardWClass = solved.cardW;
  const cardWPx = cardWClassToPx(cardWClass);
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

  // ───────── Step ② 线下填牌（同一页内嵌，不跳页）─────────
  if (step === 'offline') {
    return (
      <PageShell
        label={t(`spreadTheme.${spread.theme}`)}
        title={t(`spread.${params.key}`)}
        subtitle="线下抽牌 · 逐张填入你的牌（问题与背景沿用上一步）"
      >
        <OfflineInterpretSection
          presetSpread={params.key}
          presetQuestion={question}
          presetBackground={background}
          hideQuestionInput
          onBack={() => { setStep('setup'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      </PageShell>
    );
  }

  // ───────── Step ① 布局预览 + 问题/背景 + 两个按钮 ─────────
  return (
    <PageShell
      label={t(`spreadTheme.${spread.theme}`)}
      title={t(`spread.${params.key}`)}
      subtitle={spreadSubtitle(params.key, spread.subtitle, lang, t)}
    >
      {/* ① 牌阵布局预览 */}
      <Reveal className="mt-8">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 sm:px-7 sm:py-12">
          <div ref={layoutRef} className="relative mx-auto w-full max-w-2xl" style={{ height: solved.height, minHeight: 200 }}>
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
                    <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium text-black">
                      {idx + 1}
                    </span>
                  </button>
                  <p className="mx-auto mt-1.5 max-w-[5.5rem] truncate text-center text-[10px] leading-tight text-accent/75">
                    {spreadPositions(params.key, spread.positions, lang, t)[idx]}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-[11px] text-muted/60">{t('spreadDetail.tapHint')}</p>
        </div>
      </Reveal>

      {/* ② 适用场景总结 */}
      <Reveal delay={120}>
        <SectionHead no="01" title={t('spreadDetail.suitableTitle')} sub={undefined} />
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
          <p className="text-sm leading-relaxed text-muted">{spreadDescription(params.key, spread.description, lang, t)}</p>
        </div>
      </Reveal>

      {/* ③ 问题 + 背景输入 */}
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

      {/* ④ 二选一：开始抽牌 / 我已抽牌 */}
      <Reveal delay={480}>
        <div className="mt-8 flex flex-col items-center gap-4 pb-4">
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:items-stretch">
            <button
              onClick={start}
              disabled={!question.trim()}
              className={`glass-btn-primary w-full text-sm tracking-[0.25em] sm:px-12 sm:w-auto ${
                !question.trim() ? 'opacity-40' : ''
              }`}
            >
              <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
              {t('quick.start')}
            </button>
            <button
              onClick={() => { setStep('offline'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="liquid-glass w-full rounded-full px-8 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.04] sm:px-10 sm:w-auto"
            >
              <HelpCircle className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
              线下抽牌
            </button>
          </div>
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
