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
import { LN_SPREADS, LN_DECK, type LnDrawnCard } from '@/lib/lenormand';
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

const SPREAD_CARDS = ['lnx3', 'lnx5', 'lnx9'] as const;

function LenormandDrawInner() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  // 支持从 /lenormand 某张牌「用这张牌阵占卜」直达: ?spread=lnx3&q=xxx
  const presetSpread = SPREAD_CARDS.includes(searchParams.get('spread') as any) ? searchParams.get('spread')! : null;
  const [stage, setStage] = useState<Stage>(presetSpread ? 'draw' : 'question');
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');
  const [spreadKey, setSpreadKey] = useState<string>(presetSpread ?? 'lnx3');
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedRef = useRef<Set<number>>(new Set());
  const orderRef = useRef<number[]>([]);

  const spread = LN_SPREADS[spreadKey];
  const drawCount = spread?.count ?? 3;

  const spreadLabel = useMemo(() => {
    const zh = spread?.name ?? '';
    if (lang === 'en') return { lnx3: '3-Card Line', lnx5: '5-Card Cross', lnx9: '9-Card Square' }[spreadKey] ?? zh;
    if (lang === 'ja') return { lnx3: '3枚リーディング', lnx5: '5枚クロス', lnx9: '9枚スクエア' }[spreadKey] ?? zh;
    return zh;
  }, [spreadKey, spread, lang]);

  const positionNames = useMemo(() => {
    const zhPos = spread?.positions ?? [];
    if (lang === 'en') {
      const map: Record<string, string[]> = {
        lnx3: ['The Situation', 'What Is Happening', 'Where It Heads'],
        lnx5: ['Core Theme', 'Left Influence', 'Right Influence', 'Above · Support', 'Below · Foundation'],
        lnx9: ['Top-Left', 'Top', 'Top-Right', 'Left', 'Center · Theme', 'Right', 'Bottom-Left', 'Bottom', 'Bottom-Right'],
      };
      return map[spreadKey] ?? zhPos;
    }
    if (lang === 'ja') {
      const map: Record<string, string[]> = {
        lnx3: ['状況の流れ', '今起きていること', '向かう先'],
        lnx5: ['テーマ', '左の影響', '右の影響', '上·後押し', '下·土台'],
        lnx9: ['左上', '上', '右上', '左', '中心·テーマ', '右', '左下', '下', '右下'],
      };
      return map[spreadKey] ?? zhPos;
    }
    return zhPos;
  }, [spreadKey, spread, lang]);

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
          <div className="grid gap-4 sm:grid-cols-3">
            {SPREAD_CARDS.map((key, i) => {
              const sp = LN_SPREADS[key];
              const label = { lnx3: t('lnflow.s3'), lnx5: t('lnflow.s5'), lnx9: t('lnflow.s9') }[key];
              const sub = { lnx3: t('lnflow.s3Sub'), lnx5: t('lnflow.s5Sub'), lnx9: t('lnflow.s9Sub') }[key];
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
                    <span className="font-display text-[10px] tracking-[0.25em] text-accent/70 uppercase">{sp.count} · {key}</span>
                    <h3 className="font-display mt-3 text-sm tracking-[0.12em] text-frost">{label}</h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">{sub}</p>
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
