'use client';

// 线下已抽牌 · 输入解读
// ① 选牌阵（支持 ?spread= 预选）② 真实位置槽位搜索填牌 + 正/逆 ③ 问题/背景
// ④ 「开始解读」→ 写入解读会话 → 跳转解读室（/reading/session）流式解读
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCardImage,
  SPREADS,
  TAROT_DECK,
  CARD_EN_NAMES,
  type DrawnCard,
} from '@/lib/tarot';
import { CARD_JA_NAMES } from '@/lib/card-names';
import { LN_DECK, LN_SPREADS, LN_SPREAD_KEYS, LN_EN_NAMES as LN_EN_NAMES_I, LN_JA_NAMES as LN_JA_NAMES_I, lnImage, lnLocalName } from '@/lib/lenormand';
import { solveSpreadLayout, cardWClassToPx, customGridToCoords, solveCoordsLayout, heightBudgetPx } from '@/lib/spread-layout';
import { spreadPositions, spreadSubtitle } from '@/lib/spread-i18n';
import { useI18n } from '@/i18n';

const THEME_KEYS = ['general', 'love', 'career', 'wealth', 'choice', 'growth'];
const SPREAD_KEYS = Object.keys(SPREADS);

type Slot = { id: number; isReversed: boolean } | null;
type DeckKind = 'tarot' | 'lenormand';

function cardName(id: number, lang: string, deck: DeckKind = 'tarot'): string {
  if (deck === 'lenormand') return lnLocalName(id, lang);
  if (lang === 'ja') return CARD_JA_NAMES[id] || CARD_EN_NAMES[id] || '';
  if (lang === 'en') return CARD_EN_NAMES[id] || '';
  return TAROT_DECK.find((c) => c.id === id)?.name || '';
}

export default function OfflineInterpretSection({
  presetSpread,
  presetQuestion = '',
  presetBackground = '',
  hideQuestionInput = false,
  onBack,
  presetCustomCount,
  presetCustomPositions,
  hideCustomSettings = false,
  presetCustomCells,
  customName,
  deck = 'tarot',
}: {
  presetSpread?: string;
  presetQuestion?: string;
  presetBackground?: string;
  hideQuestionInput?: boolean;
  onBack?: () => void;
  presetCustomCount?: number;
  presetCustomPositions?: string;
  hideCustomSettings?: boolean;
  presetCustomCells?: { row: number; col: number; cols: number; name?: string; hint?: string }[];
  customName?: string;
  /** 牌组: tarot=78张(默认, 行为与旧版完全一致) | lenormand=36张无逆位 */
  deck?: DeckKind;
}) {
  const isLn = deck === 'lenormand';
  const router = useRouter();
  const { lang, t } = useI18n();
  const hasCustomPreset = !!presetCustomPositions || (!!presetCustomCells && presetCustomCells.length > 0) || presetSpread === 'custom';
  const [spreadKey, setSpreadKey] = useState(
    isLn
      ? (presetSpread && presetSpread in LN_SPREADS ? presetSpread : 'ln3a')
      : presetSpread && presetSpread in SPREADS ? presetSpread : 'three'
  );
  const [theme, setTheme] = useState<'all' | (typeof THEME_KEYS)[number]>('all');
  const [useCustom, setUseCustom] = useState(hasCustomPreset);
  const [customCount, setCustomCount] = useState(presetCustomCount || 3);
  // 默认牌位名不进 state：切语言时重新取词，避免用户没碰过输入框就固化成挂载那一刻的语言
  const [customPositions, setCustomPositions] = useState<string | null>(presetCustomPositions || null);
  const defaultPositions = t('offline.positionsDefault');
  const customPosValue = customPositions ?? defaultPositions;
  const [saveSpread, setSaveSpread] = useState(false);
  const [saveName, setSaveName] = useState(customName || '');
  const [slots, setSlots] = useState<(Slot)[]>([]);
  const [activePicker, setActivePicker] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState(presetQuestion);
  const [background, setBackground] = useState(presetBackground);
  const [error, setError] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const gridCustom = useCustom && !!presetCustomCells && presetCustomCells.length > 0;
  const L3 = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'zh';
  const n = gridCustom
    ? presetCustomCells!.length
    : useCustom ? Math.max(1, Math.min(10, customCount)) : (isLn ? LN_SPREADS[spreadKey]?.count : SPREADS[spreadKey]?.count) ?? 1;
  const positions: readonly string[] = gridCustom
    ? presetCustomCells!.map((c, i) => c.name || t('custom.position', { n: i + 1 }))
    : useCustom
      ? customPosValue.split(/[,，、]/).filter(Boolean)
      : isLn
        ? (LN_SPREADS[spreadKey]?.positions[L3] ?? [])
        : spreadPositions(spreadKey, SPREADS[spreadKey].positions, lang, t);

  const spreadOptions = useMemo(
    () => (isLn ? [...LN_SPREAD_KEYS] : theme === 'all' ? SPREAD_KEYS : SPREAD_KEYS.filter((k) => SPREADS[k]?.theme === theme)),
    [theme, isLn]
  );

  // 求解器必须拿到「牌阵盒自己的宽度」，不是外层 section 的：
  // section 的 clientWidth 含 px-8 内边距，再往里还有 max-w-6xl 和 p-6 ——
  // 393px 手机上牌阵盒实际只有 248px，而按 393 求解会让牌凸出盒子（实测右凸 1px 起）。
  const layoutBoxRef = useRef<HTMLDivElement>(null);
  const boundBoxEl = useRef<HTMLElement | null>(null);
  const [boardW, setBoardW] = useState(672);
  const [viewportH, setViewportH] = useState(0);
  useEffect(() => {
    // 牌阵盒要等牌阵/步骤切出来才存在，所以每次渲染重新探测（同解读室的写法），但只在换节点时重绑
    const el = layoutBoxRef.current;
    if (!el || el === boundBoxEl.current) return;
    boundBoxEl.current = el;
    const update = () => {
      setBoardW(el.clientWidth || 672);
      setViewportH(window.innerHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      boundBoxEl.current = null;
    };
  });

  // 牌阵/自定义变化 → 重置槽位
  useEffect(() => {
    setSlots(Array(n).fill(null));
    setActivePicker(null);
    setError('');
  }, [n, useCustom, spreadKey]);

  // 选牌器打开时 → 就近滚入视野（尽量不把牌位区挤出画面）
  useEffect(() => {
    if (activePicker !== null && pickerRef.current) {
      pickerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activePicker]);

  const layout = useMemo(() => {
    if (gridCustom) {
      const coords = customGridToCoords(presetCustomCells!);
      const geom = solveCoordsLayout(coords, 4, boardW, -1, heightBudgetPx(boardW, viewportH));
      return { coords, height: geom.height, cardW: geom.cardW };
    }
    return solveSpreadLayout(useCustom ? null : spreadKey, n, boardW, viewportH);
  }, [spreadKey, useCustom, n, boardW, viewportH, gridCustom, presetCustomCells]);

  const filtered = useMemo(() => {
    const pool: { id: number; name: string }[] = isLn ? LN_DECK : TAROT_DECK;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    if (isLn) {
      return pool.filter((c) =>
        [c.name, LN_EN_NAMES_I[(c as { id: number }).id], LN_JA_NAMES_I[(c as { id: number }).id], String(c.id)].some(
          (s) => s && String(s).toLowerCase().includes(q)
        )
      );
    }
    return pool.filter((c) =>
      [c.name, CARD_EN_NAMES[c.id], CARD_JA_NAMES[c.id], (c as { numeral?: string }).numeral, String(c.id)].some(
        (s) => s && String(s).toLowerCase().includes(q)
      )
    );
  }, [query, isLn]);

  const filledCount = slots.filter(Boolean).length;
  const allFilled = filledCount === n;

  const pickCard = (id: number) => {
    if (activePicker === null) return;
    const idx = activePicker;
    setSlots((prev) => prev.map((s, i) => (i === idx ? { id, isReversed: false } : s)));
    setQuery('');
    setActivePicker(null);
    // 视角回到刚添加这张牌的牌位 → 立刻看到已加上
    requestAnimationFrame(() => {
      document.querySelector(`[data-slot="${idx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };
  const toggleRev = (i: number) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i && s ? { ...s, isReversed: !s.isReversed } : s)));
  const clearSlot = (i: number) => setSlots((prev) => prev.map((s, idx) => (idx === i ? null : s)));

  // 「开始解读」→ 写入解读会话 → 跳解读室（流式）
  const doInterpret = () => {
    if (!allFilled) {
      setError(t('offline.incompleteError'));
      return;
    }
    const cards = slots.map((s) => {
      if (isLn) {
        const base = LN_DECK.find((x) => x.id === s!.id)!;
        return { ...base } as DrawnCard;
      }
      const base = TAROT_DECK.find((x) => x.id === s!.id)!;
      return { ...base, isReversed: s!.isReversed } as DrawnCard;
    });
    const isCustom = useCustom;
    const session = {
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        isReversed: isLn ? false : c.isReversed,
        upright: c.upright,
        reversedMeaning: c.reversedMeaning,
        element: c.element,
        zodiac: c.zodiac,
        numeral: c.numeral,
        ...(isLn ? { arcana: 'lenormand' as const } : {}),
      })),
      ...(isLn ? { deck: 'lenormand' } : {}),
      question,
      background,
      spreadName: isCustom
        ? customName || t('offline.customSpreadName', { positions: positions.join(lang === 'en' ? ', ' : '、') })
        : isLn ? (LN_SPREADS[spreadKey]?.name[L3] ?? spreadKey) : t(`spread.${spreadKey}`),
      spreadKey: !isCustom && (isLn ? LN_SPREADS[spreadKey] : SPREADS[spreadKey]) ? spreadKey : null,
      positions: [...positions],
      customLayout: gridCustom ? presetCustomCells : undefined,
      interpretation: '',
      lang,
      savedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem('tarot-reading-session', JSON.stringify(session));
    } catch {
      /* ignore */
    }
    router.push('/reading/session');
  };

  return (
    <section className="relative mx-auto max-w-[90rem] px-8 py-20 sm:px-12">
      <div className="mx-auto max-w-6xl">
        {/* 返回上一步（切换回在线抽牌/填问题背景那一步） */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm tracking-[0.15em] text-muted transition-all hover:border-accent/40 hover:text-accent"
          >
            <span aria-hidden="true">←</span> {t('offline.switchToOnline')}
          </button>
        )}

        {/* 你的问题/背景（只读显示：入口已移除，但内容沿用上一步不丢失；已保存的自定义不再显示） */}
        {hideQuestionInput && !hideCustomSettings && (question || background) && (
          <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4">
            {question && (
              <div>
                <p className="text-[11px] tracking-[0.2em] text-accent/70">{t('offline.questionLabel')}</p>
                <p className="mt-1 text-sm leading-relaxed text-frost">{question}</p>
              </div>
            )}
            {background && (
              <div className={question ? 'mt-3' : ''}>
                <p className="text-[11px] tracking-[0.2em] text-accent/70">{t('offline.backgroundLabel')}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{background}</p>
              </div>
            )}
          </div>
        )}

        {/* 一、选牌阵（仅在无预选、直接进入 /offline 时显示；自定义预设时也不显示网格） */}
        {!presetSpread && !hasCustomPreset && (
        <div className="mb-14 text-left">
          <h3 className="font-display mb-6 text-xl tracking-[0.15em] text-frost/90">{t('offline.stepSpreadTitle')}</h3>
          {!isLn && (
          <div className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setTheme('all')}
              className={`rounded-full border px-5 py-2 text-sm transition-all ${
                theme === 'all' ? 'border-accent/60 bg-accent/15 text-accent' : 'border-white/10 text-muted hover:border-accent/40'
              }`}
            >
              {t('spreads.filterAll')}
            </button>
            {THEME_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setTheme(k)}
                className={`rounded-full border px-5 py-2 text-sm transition-all ${
                  theme === k ? 'border-accent/60 bg-accent/15 text-accent' : 'border-white/10 text-muted hover:border-accent/40'
                }`}
              >
                {t(`spreadTheme.${k}`)}
              </button>
            ))}
          </div>
          )}
          <div className={`grid gap-5 ${isLn ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {spreadOptions.map((key) => {
              const sp = SPREADS[key];
              const ln = isLn ? LN_SPREADS[key] : undefined;
              const active = !useCustom && spreadKey === key;
              return (
                <button
                  key={key}
                  onClick={() => { setUseCustom(false); setSpreadKey(key); }}
                  className={`rounded-2xl border p-6 text-left transition-all duration-300 ${
                    active ? 'border-accent/50 bg-accent/[0.08] shadow-glow' : 'border-white/[0.06] bg-white/[0.02] hover:border-accent/30'
                  }`}
                >
                  <p className="font-display text-lg tracking-[0.12em] text-frost">{ln ? ln.name[L3] : t(`spread.${key}`)}</p>
                  <p className="mt-2 text-[11px] tracking-[0.2em] text-accent/70 uppercase">
                    {ln
                      ? t('offline.spreadCountLabel', { count: ln.count })
                      : `${t('offline.spreadCountLabel', { count: sp.count })} · ${t(`spreadTheme.${sp.theme}`)}`}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{ln ? ln.sub[L3] : spreadSubtitle(key, sp.subtitle, lang, t)}</p>
                </button>
              );
            })}
            <button
              onClick={() => setUseCustom(true)}
              className={`rounded-2xl border border-dashed p-6 text-left transition-all duration-300 ${
                useCustom ? 'border-accent/60 bg-accent/[0.08] shadow-glow' : 'border-accent/25 hover:border-accent/50'
              }`}
            >
              <p className="font-display text-lg tracking-[0.12em] text-accent">{t('online.customSpread')}</p>
              <p className="mt-2 text-[11px] tracking-[0.2em] text-muted uppercase">{t('offline.customEyebrow')}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t('offline.customDesc')}</p>
            </button>
          </div>
        </div>
        )}

        {/* 自定义牌阵：已保存（预设）只显示标题；未保存则给保存/张数/牌位设置 */}
        {useCustom && (
          <div className="mb-14 rounded-2xl border border-accent/20 bg-white/[0.02] p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-xl tracking-[0.15em] text-frost">{customName || t('online.customSpread')} · {t('common.cardsCount', { count: n })}</h3>
              {!hideCustomSettings && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={saveSpread}
                    onChange={(e) => setSaveSpread(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/30 accent-accent"
                  />
                  {t('custom.saveSpreadBtn')}
                </label>
              )}
            </div>
            {saveSpread && !hideCustomSettings && (
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('offline.saveNamePlaceholder')}
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-sm text-frost focus:border-accent/50 focus:outline-none"
              />
            )}
            {!hideCustomSettings && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm text-muted">{t('offline.countLabel')}</label>
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
                  <label className="mb-3 block text-sm text-muted">{t('offline.positionsLabel')}</label>
                  <input
                    value={customPosValue}
                    onChange={(e) => setCustomPositions(e.target.value)}
                    placeholder={t('offline.positionsPlaceholder')}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost focus:border-accent/50 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 二、摆牌（真实位置槽位） */}
        <div className="mb-14">
          <h3 className="font-display mb-8 text-xl tracking-[0.15em] text-frost/90">
            {t('offline.stepPlaceTitle')} <span className="ml-2 text-sm font-normal text-muted">{t('offline.stepPlaceHint')}</span>
          </h3>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div ref={layoutBoxRef} style={{ position: 'relative', height: layout.height }}>
              {positions.map((pos, i) => {
                const slot = slots[i];
                const coord = layout.coords[i];
                // 直接用求解器算出的档宽，和解读室/详情页同一个尺寸。
                // 原先还要乘 0.85 是给 in-flow 的牌位名腾地方，现在名字不占布局了，再乘就只是白缩一圈；
                // 也不能再加「不小于 44px」这类下限——求解器是按它自己那档算的净隙，
                // 牌比模型宽 4px 就会重新压上邻牌（实测马蹄阵牌×牌 108px²、维纳斯之爱标签×邻牌 261px²）。
                const cardW = cardWClassToPx(layout.cardW);
                const cardH = Math.round(cardW * (isLn ? 670 / 520 : 1.7));
                return (
                  <div
                    key={i}
                    data-slot={i}
                    style={{ left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%,-50%)' }}
                    className="absolute"
                  >
                    {/* 牌位名一律绝对定位：in-flow 的话这个包装会被长名字撑到 148px 宽（牌才 54px），
                        相邻牌位的名子互相压字（维纳斯之爱实测压叠 1 万 px²）。与解读室同一套画法。 */}
                    <p
                      title={pos}
                      className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 line-clamp-2 text-center text-[10px] leading-tight text-muted"
                      style={{ width: cardW }}
                    >
                      {pos}
                    </p>
                    {slot ? (
                      <div className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={isLn ? lnImage(slot.id) : getCardImage(slot.id)}
                          alt={cardName(slot.id, lang, deck)}
                          style={{ width: cardW, height: cardH }}
                          className={`block rounded-lg border border-accent/30 object-cover ${
                            slot.isReversed && !isLn ? 'rotate-180' : ''
                          }`}
                        />
                        {/* 正逆位胶囊只在牌宽装得下时显示：40px 的牌上这颗胶囊有 ~62px 宽，
                            会溢出压到邻牌；而逆位本来就是整张牌转 180°，旋转自己就是标记。 */}
                        {!isLn && cardW >= 56 && (
                        <span className="absolute top-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-accent-soft">
                          {slot.isReversed ? t('online.reversed') : t('online.upright')}
                        </span>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!isLn && (
                          <button onClick={() => toggleRev(i)} className="rounded-full bg-black/80 px-2 py-1 text-[10px] text-frost">
                            {t('offline.flip')}
                          </button>
                          )}
                          <button onClick={() => clearSlot(i)} className="rounded-full bg-black/80 px-2 py-1 text-[10px] text-frost">
                            {t('offline.clearSlot')}
                          </button>
                        </div>
                        {/* 牌名压在牌面下沿：它原先也在 in-flow 里，同样会把包装撑宽 */}
                        <p
                          title={cardName(slot.id, lang, deck)}
                          className="absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-black/70 px-1 py-0.5 text-center text-[9px] leading-tight text-frost"
                        >
                          {cardName(slot.id, lang, deck)}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActivePicker(i); setQuery(''); }}
                        style={{ width: cardW, height: cardH }}
                        className="flex items-center justify-center rounded-lg border border-dashed border-accent/30 text-accent/70 transition-all hover:border-accent/60 hover:text-accent"
                      >
                        <span className="text-2xl">＋</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {activePicker !== null && (
              <div ref={pickerRef} className="mt-8 rounded-2xl border border-accent/25 bg-black/40 p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <p className="text-sm text-muted">
                    {t('offline.searchHintPre')}
                    <span className="text-accent">{positions[activePicker]}</span>
                    {t('offline.searchHintPost')}
                  </p>
                  <button
                    onClick={() => setActivePicker(null)}
                    aria-label={t('common.close')}
                    className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-frost"
                  >
                    ✕
                  </button>
                </div>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isLn ? t('offline.searchPlaceholderLn') : t('offline.searchPlaceholderTarot')}
                  className="mb-5 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
                />
                <div className="grid max-h-64 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
                  {filtered.slice(0, 48).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCard(c.id)}
                      className="group flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 transition-all hover:border-accent/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isLn ? lnImage(c.id) : getCardImage(c.id)} alt={cardName(c.id, lang, deck)} className="h-24 w-16 rounded-md object-cover" />
                      <span className="mt-2 line-clamp-1 text-center text-[10px] text-frost">{cardName(c.id, lang, deck)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted">
              {t('offline.filledLabel')} <span className="text-accent">{filledCount}</span> / {t('common.cardsCount', { count: n })}
            </p>
          </div>
        </div>

        {/* 三、问题 + 背景（上一步已填则隐藏） */}
        {!hideQuestionInput && (
        <div className="mb-14 grid gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 lg:grid-cols-2">
          <div>
            <label className="mb-4 block text-sm text-muted">{t('offline.stepQuestionLabel')}</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder={t('offline.stepQuestionPlaceholder')}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-4 block text-sm text-muted">{t('offline.stepBackgroundLabel')}</label>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              maxLength={400}
              rows={4}
              placeholder={t('offline.stepBackgroundPlaceholder')}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
            />
          </div>
        </div>
        )}

        {/* 解读按钮 → 对接解读室 */}
        <div className="text-center">
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <button
            onClick={doInterpret}
            disabled={!allFilled}
            className={`liquid-glass-strong rounded-full px-16 py-5 text-base tracking-[0.25em] text-frost transition-all hover:bg-white/[0.03] ${
              !allFilled ? 'opacity-40' : ''
            }`}
          >
            {t('online.startInterpret')} →
          </button>
          <p className="mt-4 text-xs text-muted/60">{allFilled ? t('offline.enterRoomHint') : t('offline.stillMissing', { count: n - filledCount })}</p>
        </div>
      </div>
    </section>
  );
}
