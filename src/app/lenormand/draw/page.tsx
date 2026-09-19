'use client';

/**
 * 雷诺曼占卜流程：问题 → 选牌阵(3线/5十字/9方阵) → 36张漂浮抽牌 → 逐张翻牌揭示 → 解读室
 * 复用塔罗链路的会话结构(tarot-reading-session), 以 arcana='lenormand' 标记牌组;
 * 雷诺曼无逆位: 翻牌只出正位, 牌意由「连线组合」决定。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronRight, HelpCircle, RotateCcw, Sparkles, User } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import TarotScene from '@/components/TarotScene';
import CardFlipStage from '@/components/CardFlipStage';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import ArchiveSelect from '@/components/ArchiveSelect';
import { LN_SPREADS, LN_SPREAD_KEYS, LN_DECK, type LnDrawnCard } from '@/lib/lenormand';
import { preloadCardArt } from '@/lib/tarot';
import type { CustomCell } from '@/components/CustomSpreadBuilder';
import { useI18n } from '@/i18n';
import { loadArchivesSmart, type Archive } from '@/lib/astro/archives';
import { archiveContext } from '@/lib/astro/birth-context';

type Stage = 'question' | 'draw' | 'flip';

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
  // 首页已选牌阵, URL 带 ?spread=lnX 直达; 无参数时兜底三张时光线(快速占卜)
  const spreadKey = LN_SPREAD_KEYS.includes(searchParams.get('spread') as (typeof LN_SPREAD_KEYS)[number])
    ? searchParams.get('spread')!
    : 'ln3a';
  // 自定义牌阵: 布阵页带 ?spread=custom&layout= 进来 → 格位决定张数与位置
  const customLayout = useMemo<CustomCell[] | null>(() => {
    if (searchParams.get('spread') !== 'custom') return null;
    try {
      const raw = searchParams.get('layout');
      if (!raw) return null;
      const arr = JSON.parse(decodeURIComponent(raw)) as CustomCell[];
      if (!Array.isArray(arr) || !arr.length) return null;
      return arr.filter((c) => Number.isFinite(c?.row) && Number.isFinite(c?.col));
    } catch {
      return null;
    }
  }, [searchParams]);
  const [stage, setStage] = useState<Stage>('question');
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedRef = useRef<Set<number>>(new Set());
  const orderRef = useRef<number[]>([]);
  /** 翻牌阶段：点选顺序已定格为牌阵位顺序，逐张点开只是揭示 */
  const [drawnCards, setDrawnCards] = useState<SessionCard[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  // 线下抽牌: 与塔罗 /online 同款——按钮并排在「开始抽牌」旁, 点击就地展开填牌区
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef<HTMLDivElement>(null);

  // 出生档案（可选）：带入出生信息与太阳星座，让解读贴合本人
  const [archives, setArchives] = useState<Archive[]>([]);
  const [archiveId, setArchiveId] = useState('');
  useEffect(() => {
    let alive = true;
    loadArchivesSmart().then((r) => {
      if (alive) setArchives(r.list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const pickedArchive = archives.find((a) => a.id === archiveId) ?? null;
  // 档案信息并入背景交给 AI；UI 上的「背景」输入框保持用户填写的内容不变
  const bgWithArchive = [archiveContext(pickedArchive), background].filter(Boolean).join('\n');

  const spread = LN_SPREADS[spreadKey];
  const isCustom = !!customLayout?.length;
  const drawCount = isCustom ? customLayout!.length : (spread?.count ?? 3);

  const spreadLabel = isCustom
    ? (t('lnflow.customTitle'))
    : (spread?.name[L] ?? '');
  const positionNames: readonly string[] = isCustom
    ? customLayout!.map((c, i) => c.name || t('custom.position', { n: i + 1 }))
    : (spread?.positions[L] ?? []);

  const toggleCard = (id: number) => {
    const s = selectedRef.current;
    if (s.has(id)) {
      s.delete(id);
      orderRef.current = orderRef.current.filter((x) => x !== id);
    } else if (s.size < drawCount) {
      s.add(id);
      orderRef.current.push(id); // 记录点选顺序 = 牌阵位顺序
      preloadCardArt([id], 'lenormand');
    }
    setSelectedCount(s.size);
  };

  const startFlip = () => {
    const drawn: SessionCard[] = orderRef.current.map((uid) => {
      const base = LN_DECK.find((c) => c.id === uid) as LnDrawnCard;
      return { ...base };
    });
    setDrawnCards(drawn);
    setFlipped(new Array(drawn.length).fill(false));
    setStage('flip');
  };

  const allFlipped = flipped.length > 0 && flipped.every(Boolean);
  const flipCard = (index: number) => setFlipped((prev) => prev.map((v, i) => (i === index ? true : v)));

  /** 翻完才放行：写会话的牌 = 客户刚点开看过的那几张 */
  const enterRoom = () => {
    try {
      window.sessionStorage.setItem(
        'tarot-reading-session',
        JSON.stringify({
          cards: drawnCards,
          deck: 'lenormand',
          question,
          background: bgWithArchive,
          spreadName: spreadLabel,
          spreadKey: isCustom ? null : spreadKey,
          positions: [...positionNames],
          ...(isCustom ? { customLayout: customLayout! } : {}),
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
      wide={stage !== 'question'}
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

          {/* 关联出生档案（可选）：带入出生信息与太阳星座，让解读贴合本人 */}
          {archives.length > 0 && (
            <Reveal delay={220}>
              <ArchiveSelect archives={archives} value={archiveId} onChange={setArchiveId} />
            </Reveal>
          )}

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
              <button
                onClick={() => { if (question.trim()) setStage('draw'); }}
                disabled={!question.trim()}
                className={`glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12 ${!question.trim() ? 'opacity-40' : ''}`}
              >
                <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
                {t('lnflow.drawBtn')}
              </button>
              <button
                onClick={() => {
                  setOffline(true);
                  requestAnimationFrame(() => offlineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }}
                className="liquid-glass w-full rounded-full px-8 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.04] sm:w-auto sm:px-10"
              >
                {t('custom.offlineBtn')}
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/60">
              {spreadLabel} · {t('common.cardsCount', { count: drawCount })}
            </p>
          </Reveal>

          {/* 线下抽牌 → 就地内嵌填牌区（内置阵带真实阵形; 自定义阵带入格位） */}
          {offline && (
            <div ref={offlineRef} className="mt-2">
              <OfflineInterpretSection
                deck="lenormand"
                {...(isCustom
                  ? {
                      presetCustomCount: drawCount,
                      presetCustomPositions: positionNames.join(','),
                      presetCustomCells: customLayout!,
                      customName: spreadLabel,
                    }
                  : { presetSpread: spreadKey })}
                presetQuestion={question}
                presetBackground={bgWithArchive}
                hideQuestionInput
                onBack={() => { setOffline(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            </div>
          )}
        </div>
      )}

      {/* 第2步: 36张漂浮抽牌 */}
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
                      setDrawnCards([]);
                      setFlipped([]);
                      setStage('question');
                    }}
                    className="glass-btn text-sm"
                  >
                    <RotateCcw className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('online.flipBack')}
                  </button>
                  <button
                    onClick={startFlip}
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

      {/* 第3步: 逐张翻牌揭示（与塔罗链路同款；雷诺曼只揭示正位） */}
      {stage === 'flip' && (
        <section className="py-2">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-10 sm:px-10">
              <h2 className="font-display mb-2 text-center text-lg tracking-[0.15em] text-frost/90">{t('online.flip')}</h2>
              <p className="mb-9 text-center text-[11px] leading-relaxed text-muted/70">
                {allFlipped ? t('flip.allOpenHint') : t('flip.progress', { done: flipped.filter(Boolean).length, total: drawnCards.length })}
              </p>
              <CardFlipStage
                cards={drawnCards}
                flipped={flipped}
                onFlip={flipCard}
                positions={[...positionNames]}
                deck="lenormand"
              />
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button onClick={() => setStage('draw')} className="glass-btn w-full text-sm sm:w-auto sm:px-8">
                  <RotateCcw className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('flip.repick')}
                </button>
                <button
                  onClick={enterRoom}
                  disabled={!allFlipped}
                  className={`glass-btn-primary w-full text-sm sm:w-auto sm:px-10 ${allFlipped ? '' : 'opacity-40'}`}
                >
                  {t('flip.enterRoom')} <ChevronRight className="ml-1 inline-block h-4 w-4" aria-hidden="true" />
                </button>
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
