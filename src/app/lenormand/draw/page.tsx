'use client';

/**
 * 雷诺曼占卜流程：问题 → 选牌阵(3线/5十字/9方阵) → 36张漂浮抽牌 → 解读室
 * 复用塔罗链路的会话结构(tarot-reading-session), 以 arcana='lenormand' 标记牌组;
 * 雷诺曼无逆位: 翻牌只出正位, 牌意由「连线组合」决定。
 */
import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronRight, HelpCircle, RotateCcw, Sparkles, User } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import TarotScene from '@/components/TarotScene';
import { LN_SPREADS, LN_SPREAD_KEYS, LN_DECK, type LnDrawnCard } from '@/lib/lenormand';
import { useI18n } from '@/i18n';

type Stage = 'question' | 'spread' | 'draw';

/** 与塔罗解读室 DrawnCard 对齐的会话卡片 */
interface SessionCard {
  id: number;
  name: string;
  isReversed: false;
  upright: string;
  reversedMeaning: string;
  element: string;
  zodiac: string;
  numeral: string;
  arcana: 'lenormand';
}

function LenormandDrawInner() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const L = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'zh';
  const searchParams = useSearchParams();
  // 首页点牌阵直达: ?spread=ln5 —— 有预设阵也先停在「问题」步(雷诺曼必须有问题才能解)
  const presetSpread = LN_SPREAD_KEYS.includes(searchParams.get('spread') as (typeof LN_SPREAD_KEYS)[number])
    ? searchParams.get('spread')!
    : 'ln3a';
  const [stage, setStage] = useState<Stage>('question');
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');
  const [spreadKey, setSpreadKey] = useState<string>(presetSpread);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedRef = useRef<Set<number>>(new Set());
  const orderRef = useRef<number[]>([]);

  const spread = LN_SPREADS[spreadKey];
  const drawCount = spread?.count ?? 3;

  const spreadLabel = spread?.name[L] ?? '';
  const positionNames = spread?.positions[L] ?? [];

  const toggleCard = (id: number) => {
    const s = selectedRef.current;
    if (s.has(id)) {
      s.delete(id);
      orderRef.current = orderRef.current.filter((x) => x !== id);
    } else if (s.size < drawCount) {
      s.add(id);
      orderRef.current.push(id); // 记录点选顺序 = 牌阵位顺序
    }
    setSelectedCount(s.size);
  };

  const doReveal = () => {
    const drawn: SessionCard[] = orderRef.current.map((uid) => {
      const base = LN_DECK.find((c) => c.id === uid) as LnDrawnCard;
      return { ...base };
    });
    try {
      window.sessionStorage.setItem(
        'tarot-reading-session',
        JSON.stringify({
          cards: drawn,
          deck: 'lenormand',
          question,
          background,
          spreadName: spreadLabel,
          spreadKey,
          positions: positionNames,
          interpretation: '',
          lang,
          savedAt: Date.now(),
        })
      );
    } catch { /* ignore */ }
    router.push('/reading/session');
  };

  return (
    <PageShell
      label={t('page.lenormand.label')}
      title={t('lnflow.title')}
      subtitle={t('lnflow.subtitle')}
      wide={stage === 'draw'}
      compact={stage === 'draw'}
    >
      {/* 第1步: 问题+背景 */}
      {stage === 'question' && (
        <div className="mx-auto mt-10 w-full max-w-2xl sm:mt-14">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <label htmlFor="ln-question" className="font-display text-sm tracking-[0.2em] text-frost">
                  {t('quick.questionLabel')}
                </label>
              </div>
              <textarea
                id="ln-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('lnflow.qPlaceholder')}
                maxLength={120}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
              />
              <p className="mt-2 text-right text-[11px] text-muted/60">{question.length} / 120</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
                  <User className="h-4 w-4" />
                </span>
                <label htmlFor="ln-background" className="font-display text-sm tracking-[0.2em] text-frost">
                  {t('quick.bgLabel')}
                </label>
              </div>
              <textarea
                id="ln-background"
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
          <Reveal delay={240}>
            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={() => { if (question.trim()) setStage('spread'); }}
                disabled={!question.trim()}
                className={`glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12 ${!question.trim() ? 'opacity-40' : ''}`}
              >
                <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
                {t('lnflow.chooseSpread')}
              </button>
            </div>
          </Reveal>
        </div>
      )}

      {/* 第2步: 选牌阵 */}
      {stage === 'spread' && (
        <div className="mx-auto mt-10 w-full max-w-3xl sm:mt-14">
          <Reveal>
            <h2 className="font-display mb-6 text-center text-lg tracking-[0.15em] text-frost/90">{t('lnflow.spreadTitle')}</h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {LN_SPREAD_KEYS.map((key, i) => {
              const sp = LN_SPREADS[key];
              return (
                <Reveal key={key} delay={i * 90}>
                  <button
                    onClick={() => { setSpreadKey(key); setStage('draw'); selectedRef.current.clear(); orderRef.current = []; setSelectedCount(0); }}
                    className={`group h-full w-full rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
                      spreadKey === key
                        ? 'border-accent/40 bg-accent/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-accent/30 hover:bg-accent/[0.04]'
                    }`}
                  >
                    <span className="font-display text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                      {t('common.cardsCount', { count: sp.count })}
                    </span>
                    <h3 className="font-display mt-3 text-sm tracking-[0.12em] text-frost">{sp.name[L]}</h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">{sp.sub[L]}</p>
                    <span className="mt-4 block text-xs tracking-[0.1em] text-muted/60 transition-colors group-hover:text-accent">{t('lnflow.start')} →</span>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}

      {/* 第3步: 36张漂浮抽牌 */}
      {stage === 'draw' && (
        <section className="py-2">
          <Reveal>
            <div className="-mx-4 sm:-mx-8 lg:-mx-14">
              <div className="tarot-scene-host relative">
                <TarotScene
                  deck="lenormand"
                  maxSelect={drawCount}
                  selectedIds={Array.from(selectedRef.current)}
                  onToggleCard={toggleCard}
                />
                <div className="absolute bottom-0 left-0 right-0 z-[1300] flex flex-wrap items-center justify-center gap-x-6 gap-y-3 bg-gradient-to-t from-[rgba(7,6,10,0.88)] via-[rgba(7,6,10,0.45)] to-transparent px-4 py-4 sm:py-5">
                  <span className="font-display text-[11px] tracking-[0.2em] text-accent/80">{spreadLabel}</span>
                  <div className="flex items-baseline gap-2 font-display tracking-[0.2em]">
                    <span className={`text-3xl ${selectedCount >= drawCount ? 'text-accent' : 'text-frost'}`}>{selectedCount}</span>
                    <span className="text-lg text-muted">/</span>
                    <span className="text-lg text-muted">{drawCount}</span>
                  </div>
                  <button
                    onClick={() => {
                      selectedRef.current.clear();
                      orderRef.current = [];
                      setSelectedCount(0);
                      setStage('question');
                    }}
                    className="glass-btn text-sm"
                  >
                    <RotateCcw className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('online.flipBack')}
                  </button>
                  <button
                    onClick={doReveal}
                    disabled={selectedCount < drawCount}
                    className={`glass-btn-primary text-sm ${selectedCount < drawCount ? 'opacity-40' : ''}`}
                  >
                    {t('online.flip')} <ChevronRight className="ml-1 inline-block h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}
    </PageShell>
  );
}

export default function LenormandDrawPage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <LenormandDrawInner />
    </Suspense>
  );
}
