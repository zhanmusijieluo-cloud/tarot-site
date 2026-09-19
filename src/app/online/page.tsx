'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import { useRouter, useSearchParams } from 'next/navigation';
import TarotScene from '@/components/TarotScene';
import CardFlipStage from '@/components/CardFlipStage';
import OfflineInterpretSection from '@/components/OfflineInterpretSection';
import ArchiveSelect from '@/components/ArchiveSelect';
import { TAROT_DECK, SPREADS, type DrawnCard, type Spread } from '@/lib/tarot';
import { spreadPositions } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';
import { loadArchivesSmart, type Archive } from '@/lib/astro/archives';
import { archiveContext } from '@/lib/astro/birth-context';

type Stage = 'catalogue' | 'draw' | 'flip';

/** 自定义牌阵格位：与 /online/custom 布阵页、解读室共用结构 */
interface CustomCell {
  row: number;
  col: number;
  cols: number;
  name?: string;
  hint?: string;
}

const CARD_BACK = '/cards/card-back-new.webp';

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
  const deckRef = useRef<{ id: number; reversed: boolean }[]>([]);
  // 翻牌阶段：客户逐张点开才揭示，flipped[i] 对应 deckRef 第 i 张
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const offlineRef = useRef<HTMLDivElement>(null);

  // 出生档案（可选）：带入出生信息与太阳星座，让解读贴合本人
  const [archives, setArchives] = useState<Archive[]>([]);
  // 支持从档案页带 ?archive=<id> 过来时直接选中该档案
  const [archiveId, setArchiveId] = useState(searchParams.get('archive') ?? '');
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
  const selectedRef = useRef<Set<number>>(new Set());

  const spread: Spread | null = useMemo(
    () => (selectedSpread === 'custom' || selectedSpread === 'quick' || selectedSpread === 'daily') ? null : SPREADS[selectedSpread],
    [selectedSpread]
  );
  const drawCount = useMemo(
    () => (selectedSpread === 'quick' ? 3 : selectedSpread === 'daily' ? 1 : selectedSpread === 'custom' ? (customLayout?.length ?? 1) : spread?.count ?? 1),
    [spread, selectedSpread, customLayout]
  );

  // 快速占卜：进入即预抽三张（无牌阵）；每日运势：单牌。
  // 牌阵名要进 AI prompt 和解读室标题，故走 t() 而非 tarot.ts 原文；custom 原先回落成英文 'Single'
  const spreadNameForResult = useMemo(
    () =>
      selectedSpread === 'quick'
        ? t('tarot.entries.quick')
        : selectedSpread === 'daily'
          ? t('page.daily.title')
          : selectedSpread === 'custom'
            ? t('online.customSpread')
            : t(`spread.${selectedSpread}`),
    [selectedSpread, t]
  );

  // 自定义牌阵：只有带 layout 参数进来才算（'custom' 无格位时按普通流程处理）
  const isCustomSpread = selectedSpread === 'custom' && !!customLayout?.length;

  // 自定义牌阵牌位名：布阵时客户命名（未命名用「第 N 张」兜底），随站点语言微调
  const customPositionNames = useMemo(() => {
    if (selectedSpread !== 'custom' || !customLayout) return [];
    return customLayout.map((c, i) => {
      if (c.name) return lang === 'en' ? `Position ${i + 1} (${c.name})` : c.name;
      return lang === 'en' ? `Position ${i + 1}` : t('custom.position', { n: i + 1 });
    });
  }, [customLayout, selectedSpread, lang, t]);

  // 开始抽牌：清空牌池，直接进入抽牌阶段（牌序完全由 draw 阶段点选决定）
  const doShuffle = () => {
    deckRef.current = [];
    selectedRef.current.clear();
    setSelectedCount(0);
    setCards([]);
    setFlipped([]);
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
  // reversed 由场景在洗牌时就随牌定好，点中即确定，后续阶段只搬运不再重掷
  const toggleCard = (id: number, reversed: boolean) => {
    const s = selectedRef.current;
    if (s.has(id)) {
      s.delete(id);
      deckRef.current = deckRef.current.filter((x) => x.id !== id);
    } else if (s.size < drawCount) {
      s.add(id);
      if (!deckRef.current.some((x) => x.id === id)) deckRef.current.push({ id, reversed });
    }
    setSelectedCount(s.size);
    setCards(deckRef.current.map(({ id: uid, reversed: rev }) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: rev } as DrawnCard;
    }));
  };

  // 抽齐 → 进入翻牌阶段（牌已定，客户逐张翻开揭示）
  const startFlip = () => {
    if (selectedCount < drawCount) return;
    setFlipped(new Array(deckRef.current.length).fill(false));
    setStage('flip');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const flipCard = (index: number) => setFlipped((prev) => prev.map((v, i) => (i === index ? true : v)));
  const allFlipped = flipped.length > 0 && flipped.every(Boolean);

  // 牌位名：自定义牌阵用布阵时的命名，内置牌阵按语言取，与解读室拿到的是同一份
  const positionNames = isCustomSpread
    ? customPositionNames
    : spreadPositions(selectedSpread, spread?.positions ?? [], lang, t);

  // 翻完牌：写入会话（正文留空）并跳转解读室，由解读室内流式生成解读
  const enterRoom = () => {
    const isCustom = isCustomSpread;
    try {
      window.sessionStorage.setItem(
        'tarot-reading-session',
        JSON.stringify({
          cards: cards.map((c) => ({
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
          background: bgWithArchive,
          spreadName: spreadNameForResult,
          spreadKey: !isCustom && selectedSpread !== 'quick' && SPREADS[selectedSpread] ? selectedSpread : null,
          positions: positionNames,
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
              <h2 className="font-display mb-8 text-center text-lg tracking-[0.15em] text-frost/90">{t('online.noSpreadTitle')}</h2>
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

          {/* 关联出生档案（可选）：带入出生信息与太阳星座，让解读贴合本人 */}
          {archives.length > 0 && (
            <Reveal delay={160}>
              <ArchiveSelect archives={archives} value={archiveId} onChange={setArchiveId} />
            </Reveal>
          )}

          {/* 在线 / 线下 */}
          <Reveal delay={200}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
              <button onClick={startOnline} className="glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12">
                <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('quick.start')}
              </button>
              <button onClick={startOffline} className="liquid-glass w-full rounded-full px-8 py-4 text-sm tracking-[0.2em] text-frost transition-all hover:bg-white/[0.04] sm:w-auto sm:px-10">
                {t('custom.offlineBtn')}
              </button>
            </div>
          </Reveal>

          {/* 线下抽牌 → 内嵌线下填牌（三张无牌阵） */}
          {offline && (
            <div ref={offlineRef} className="mt-2">
              <OfflineInterpretSection
                presetCustomCount={3}
                presetCustomPositions={[1, 2, 3].map((n) => t('custom.position', { n })).join(',')}
                customName={t('online.noSpreadTitle')}
                presetQuestion={question}
                presetBackground={bgWithArchive}
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

      {/* 翻牌阶段：牌与正逆位在洗牌时已随位置定好，这里逐张点开只是揭示 */}
      {stage === 'flip' && (
        <section className="py-2">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-10 sm:px-10">
              <h2 className="font-display mb-2 text-center text-lg tracking-[0.15em] text-frost/90">{t('online.flip')}</h2>
              <p className="mb-9 text-center text-[11px] leading-relaxed text-muted/70">
                {allFlipped ? t('flip.allOpenHint') : t('flip.progress', { done: flipped.filter(Boolean).length, total: cards.length })}
              </p>
              <CardFlipStage cards={cards} flipped={flipped} onFlip={flipCard} positions={positionNames} />
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

export default function OnlinePage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <OnlineInner />
    </Suspense>
  );
}
