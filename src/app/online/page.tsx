'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { ChevronRight, Compass, Gem, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import { useRouter, useSearchParams } from 'next/navigation';
import TarotScene from '@/components/TarotScene';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import { TAROT_DECK, SPREADS, type DrawnCard, type Spread } from '@/lib/tarot';
import { spreadSubtitle, spreadPositions } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';

type Stage = 'catalogue' | 'draw';

/** 自定义牌阵格位：与 /online/custom 布阵页、解读室共用结构 */
interface CustomCell {
  row: number;
  col: number;
  cols: number;
  name?: string;
}

const CARD_BACK = '/cards/card-back-new.webp';

const SPREAD_OPTIONS = [
  { id: 'single', nameKey: 'online.spread.single', count: 1, subtitleKey: 'online.spread.singleSub', theme: 'general' },
  { id: 'three', nameKey: 'online.spread.three', count: 3, subtitleKey: 'online.spread.threeSub', theme: 'general' },
  { id: 'situation', nameKey: 'online.spread.situation', count: 5, subtitleKey: 'online.spread.situationSub', theme: 'general' },
  { id: 'horseshoe', nameKey: 'online.spread.horseshoe', count: 7, subtitleKey: 'online.spread.horseshoeSub', theme: 'general' },
];

function OnlineInner() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const isQuick = searchParams.get('spread') === 'quick';
  // 每日运势：固定 1 张牌 + 固定问题「我今天的运势？从各个方面解释」，进入即抽牌
  const isDaily = searchParams.get('spread') === 'daily';
  // 来自推荐牌阵页（/spreads）的指定牌阵：URL 带 spread=key 时直接预选
  const presetSpread = useMemo(() => {
    const s = searchParams.get('spread');
    return s && s !== 'quick' && s !== 'custom' && SPREADS[s] ? s : null;
  }, [searchParams]);
  // 自定义牌阵：布阵页传来的格位布局（row/col/name），决定抽几张与解读室摆放位置
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
  // 自定义牌阵：布阵页直接带 layout 参数进来，跳过牌阵目录直接进入抽牌
  const [stage, setStage] = useState<Stage>(isQuick || isDaily || presetSpread || customLayout ? 'draw' : 'catalogue');
  const [selectedSpread, setSelectedSpread] = useState(isQuick ? 'quick' : isDaily ? 'daily' : customLayout ? 'custom' : presetSpread ?? 'three');
  // 每日运势：固定问题；其余从 URL 或目录流程带入
  const [question, setQuestion] = useState(isDaily ? t('daily.fixedQuestion') : (searchParams.get('q') ?? ''));
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [offline, setOffline] = useState(false);
  const deckRef = useRef<number[]>([]);
  const offlineRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Set<number>>(new Set());

  const spread: Spread | null = useMemo(
    () => (selectedSpread === 'custom' || selectedSpread === 'quick' || selectedSpread === 'daily') ? null : SPREADS[selectedSpread],
    [selectedSpread]
  );
  const drawCount = useMemo(
    () => (selectedSpread === 'quick' ? 3 : selectedSpread === 'daily' ? 1 : selectedSpread === 'custom' ? (customLayout?.length ?? 1) : spread?.count ?? 1),
    [spread, selectedSpread, customLayout]
  );

  // 快速占卜：进入即预抽三张（无牌阵）；每日运势：单牌
  const spreadNameForResult = useMemo(
    () => selectedSpread === 'quick' ? t('tarot.entries.quick') : selectedSpread === 'daily' ? t('page.daily.title') : spread?.name ?? 'Single',
    [selectedSpread, spread, t]
  );

  // 自定义牌阵牌位名：布阵时客户命名（未命名用「第 N 张」兜底），随站点语言微调
  const customPositionNames = useMemo(() => {
    if (selectedSpread !== 'custom' || !customLayout) return [];
    return customLayout.map((c, i) => {
      if (c.name) return lang === 'en' ? `Position ${i + 1} (${c.name})` : c.name;
      return lang === 'en' ? `Position ${i + 1}` : t('custom.position', { n: i + 1 });
    });
  }, [customLayout, selectedSpread, lang, t]);

  // 牌位名跟随站点语言（共享辅助：从 i18n 的 spreadPos.<key>.<i> 提取「」内牌位名，缺键回退原文）
  const localizePositions = useMemo(() => {
    return (positionsZh: readonly string[]): string[] =>
      spreadPositions(selectedSpread, positionsZh, lang, t);
  }, [lang, selectedSpread, t]);

  // 开始抽牌：清空牌池，直接进入抽牌阶段（牌序完全由 draw 阶段点选决定）
  const doShuffle = () => {
    deckRef.current = [];
    selectedRef.current.clear();
    setSelectedCount(0);
    setCards([]);
    setStage('draw');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 落地页「在线抽牌」：三张无牌阵 → 进入抽牌
  const startOnline = () => {
    setSelectedSpread('quick');
    setOffline(false);
    doShuffle();
  };

  // 落地页「线下抽牌」：内嵌线下填牌，并滚到该区域（避免在下方被忽略）
  const startOffline = () => {
    setOffline(true);
    requestAnimationFrame(() => {
      offlineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // 选牌（quick 模式从空牌池直接点选，同步维护 deckRef）
  const toggleCard = (id: number) => {
    const s = selectedRef.current;
    if (s.has(id)) {
      s.delete(id);
      deckRef.current = deckRef.current.filter((x) => x !== id);
    } else if (s.size < drawCount) {
      s.add(id);
      if (!deckRef.current.includes(id)) deckRef.current.push(id);
    }
    setSelectedCount(s.size);
    setCards([...s].map((uid) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: false } as DrawnCard;
    }));
  };

  // 选完牌：立即写入会话（正文留空）并跳转解读室，由解读室内流式生成解读
  const doReveal = () => {
    const drawn = deckRef.current.map((uid) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: Math.random() < 0.5 } as DrawnCard;
    });
    const isCustom = selectedSpread === 'custom' && !!customLayout?.length;
  try {
      window.sessionStorage.setItem(
        'tarot-reading-session',
        JSON.stringify({
          cards: drawn.map((c) => ({
            id: c.id,
            name: c.name,
            isReversed: c.isReversed,
            upright: c.upright,
            reversedMeaning: c.reversedMeaning,
            element: c.element,
            zodiac: c.zodiac,
            numeral: c.numeral,
          })),
          question,
          background,
          spreadName: spreadNameForResult,
          spreadKey: !isCustom && selectedSpread !== 'quick' && SPREADS[selectedSpread] ? selectedSpread : null,
          positions: isCustom ? customPositionNames : localizePositions(spread?.positions ?? []),
          // 自定义牌阵格位：解读室按 row/col 原样还原客户摆放的位置
          customLayout: isCustom ? customLayout : undefined,
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
      label={t('page.online.label')}
      title={t('page.online.title')}
      subtitle={t('page.online.subtitle')}
      compact={stage === 'draw'}
    >
      {/* 目录 */}
      {stage === 'catalogue' && (
        <section>
          {/* 三张无牌阵 · 卡背预览（横排摆好） */}
          <Reveal>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 sm:px-10">
              <h2 className="font-display mb-8 text-center text-lg tracking-[0.15em] text-frost/90">三张无牌阵</h2>
              <div className="flex items-center justify-center gap-5 sm:gap-7">
                {[0, 1, 2].map((i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={CARD_BACK} alt="" className="w-[80px] rounded-lg shadow-md shadow-black/50 sm:w-[96px]" />
                ))}
              </div>
            </div>
          </Reveal>

          {/* 问题 + 背景 */}
          <Reveal delay={120}>
            <div className="mt-6 grid gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 lg:grid-cols-2">
              <div>
                <label htmlFor="online-question" className="font-display mb-3 block text-sm tracking-[0.2em] text-frost">{t('quick.questionLabel')}</label>
                <textarea
                  id="online-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t('quick.questionPlaceholder')}
                  maxLength={120}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="online-bg" className="font-display mb-3 block text-sm tracking-[0.2em] text-frost">{t('quick.bgLabel')}</label>
                <textarea
                  id="online-bg"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder={t('quick.bgPlaceholder')}
                  maxLength={300}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
                />
              </div>
            </div>
          </Reveal>

          {/* 在线 / 线下 */}
          <Reveal delay={200}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
              <button onClick={startOnline} className="glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12">
                <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('quick.start')}
              </button>
              <button onClick={startOffline} className="liquid-glass w-full rounded-full px-8 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.04] sm:w-auto sm:px-10">
                线下抽牌
              </button>
            </div>
          </Reveal>

          {/* 线下抽牌 → 内嵌线下填牌（三张无牌阵） */}
          {offline && (
            <div ref={offlineRef} className="mt-2">
              <OfflineInterpretSection
                presetCustomCount={3}
                presetCustomPositions="第一张,第二张,第三张"
                customName="三张无牌阵"
                presetQuestion={question}
                presetBackground={background}
                hideCustomSettings
                hideQuestionInput
                onBack={() => { setOffline(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            </div>
          )}
        </section>
      )}

      {/* 抽牌场景：计数/返回/翻牌叠加在场景底部，一屏全可见 */}
      {stage === 'draw' && (
        <section className="py-2">
          <Reveal>
            <div className="-mx-4 sm:-mx-8 lg:-mx-14">
              <div className="tarot-scene-host relative">
                <TarotScene
                  maxSelect={drawCount}
                  selectedIds={cards.map((c) => c.id)}
                  onToggleCard={toggleCard}
                />
                {/* 底部控制栏：叠加在场景底部，不占滚动空间；z-1300 压在漂移卡牌(z-index 1000+)之上，绝不被盖住 */}
                <div className="absolute bottom-0 left-0 right-0 z-[1300] flex items-center justify-center gap-x-6 gap-y-3 bg-gradient-to-t from-[rgba(7,6,10,0.88)] via-[rgba(7,6,10,0.45)] to-transparent px-4 py-4 sm:py-5">
                  <div className="flex items-baseline gap-2 font-display tracking-[0.2em]">
                    <span className={`text-3xl ${selectedCount >= drawCount ? 'text-accent' : 'text-frost'}`}>
                      {selectedCount}
                    </span>
                    <span className="text-lg text-muted">/</span>
                    <span className="text-lg text-muted">{drawCount}</span>
                  </div>
                  <button
                    onClick={() => {
                      // 快速占卜：返回填问题页（带上已填内容方便修改）；每日运势：返回主页；其他牌阵：返回牌阵目录
                      if (selectedSpread === 'quick') {
                        const q = encodeURIComponent(question);
                        const bg = encodeURIComponent(background);
                        router.push(`/online/quick?q=${q}&bg=${bg}`);
                      } else if (selectedSpread === 'daily') {
                        router.push('/');
                      } else {
                        setStage('catalogue');
                      }
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

export default function OnlinePage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <OnlineInner />
    </Suspense>
  );
}
