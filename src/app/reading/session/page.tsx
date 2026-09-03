'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, ChevronRight, CornerDownRight, Gem, Loader2, MessageCircleQuestion, RotateCcw, SendHorizontal, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PageShell, { Reveal } from '@/components/PageShell';
import TarotScene from '@/components/TarotScene';
import LogoSpinner from '@/components/LogoSpinner';
import { type DrawnCard, getCardImage, CARD_EN_NAMES, TAROT_DECK, SPREADS } from '@/lib/tarot';
import { localizedCardName, CARD_JA_NAMES } from '@/lib/card-names';
import { spreadPositions } from '@/lib/spread-i18n';
import { getSpreadCoords, getCrossIdx, solveSpreadLayout, solveCustomGridLayout, CARD_H_RATIO, cardWClassToPx } from '@/lib/spread-layout';
import { getMcpClient } from '@/mcp/client';
import { useI18n } from '@/i18n';

/** sessionStorage 会话结构（由 /online 抽牌流程写入） */
interface ReadingSession {
  cards: DrawnCard[];
  question: string;
  background: string;
  spreadName: string;
  /** 牌阵 key（如 horseshoe/relationship），用于匹配布局注册表；quick/custom 无 key */
  spreadKey?: string | null;
  positions: string[];
  /** 自定义牌阵格位：解读室按 row/col 原样还原客户布阵时的摆放位置 */
  customLayout?: { row: number; col: number; cols: number; name?: string }[];
  interpretation: string;
  /** 解读生成时的语言：语言切换时自动重新生成对应语言解读 */
  lang?: string;
  savedAt: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 追问抽牌解读：该条回复对应的三张新牌，渲染在解释文字上方 */
  cards?: DrawnCard[];
}

const SESSION_KEY = 'tarot-reading-session';
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 小时内可追问
/** 追问对话记录持久化（独立 key：刷新页面后追问历史不丢失，TTL 与会话一致） */
const CHAT_KEY = 'tarot-reading-chat';
/** 追问语气模式持久化（独立 key，跨会话保留用户偏好） */
const MODE_KEY = 'tarot-followup-mode';

/** 追问语气模式：warm 温柔陪伴 / sassy 毒舌吐槽 / tsundere 嘴硬心软傲娇 */
type ChatMode = 'warm' | 'sassy' | 'tsundere';
const CHAT_MODES: ChatMode[] = ['warm', 'sassy', 'tsundere'];

function loadChatMode(): ChatMode {
  if (typeof window === 'undefined') return 'warm';
  try {
    const raw = window.sessionStorage.getItem(MODE_KEY);
    return raw === 'sassy' || raw === 'tsundere' ? raw : 'warm';
  } catch {
    return 'warm';
  }
}

interface ChatPersist {
  chat: ChatMessage[];
  allExtraCards: DrawnCard[];
  savedAt: number;
}

/** 牌名按站点语言本地化（zh 原名 / ja 日语名 / en 英文名），供 UI 渲染与 AI 传参共用 */

/** 统计解读文本的「浮现单元」总数：板块1按每张牌计 + 后续各板块（板块2~7） */
function loadSession(): ReadingSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ReadingSession;
    if (!data.cards?.length) return null;
    // interpretation 可为空串：抽牌页直接跳转过来时正文由本页流式生成
    if (data.interpretation === undefined || data.interpretation === null) return null;
    if (Date.now() - (data.savedAt || 0) > SESSION_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

export default function ReadingSessionPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [followUp, setFollowUp] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  /** 追问语气模式（温柔陪伴 / 毒舌吐槽 / 嘴硬心软傲娇），持久化跨会话 */
  const [chatMode, setChatMode] = useState<ChatMode>(loadChatMode);
  /** 主题语言与解读语言不一致时，正在自动重新生成该语言解读 */
  const [regenerating, setRegenerating] = useState(false);
  /** 重新生成的流式文本（打字机实时渲染） */
  const [regenText, setRegenText] = useState('');
  const regenRef = useRef<HTMLDivElement>(null);
  const [regenerateError, setRegenerateError] = useState('');

  // ═══ 后续问题抽牌状态 ═══
  const [showDrawScene, setShowDrawScene] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  // 本场占卜中历次追问抽到的所有牌（累积），追问回答时与原牌阵一起交给 AI
  const [allExtraCards, setAllExtraCards] = useState<DrawnCard[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setChecked(true);
  }, []);

  // 恢复追问对话记录（刷新页面后追问历史不丢，TTL 与会话一致）
  useEffect(() => {
    if (!checked || !session) return;
    try {
      const raw = window.sessionStorage.getItem(CHAT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as ChatPersist;
      // 新会话（savedAt 更新）时清掉旧追问记录，避免串场
      if (session.savedAt > (data.savedAt || 0)) {
        window.sessionStorage.removeItem(CHAT_KEY);
        return;
      }
      if (!Array.isArray(data.chat) || !data.chat.length) return;
      if (Date.now() - (data.savedAt || 0) > SESSION_TTL) return;
      setChat(data.chat);
      if (Array.isArray(data.allExtraCards) && data.allExtraCards.length) {
        setAllExtraCards(data.allExtraCards);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, session]);

  // 追问对话记录持久化（savedAt 与会话对齐，用于判断新旧会话）
  useEffect(() => {
    if (!checked || !session) return;
    if (!chat.length && !allExtraCards.length) return;
    try {
      const data: ChatPersist = { chat, allExtraCards, savedAt: session.savedAt };
      window.sessionStorage.setItem(CHAT_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, session, chat, allExtraCards]);

  // 自动流式生成解读：①抽牌页直接跳转过来（正文为空）②会话语言与站点语言不一致
  useEffect(() => {
    if (!session || !checked) return;
    const needInitial = !session.interpretation.trim();
    // 旧会话无 lang 字段且已有正文：视为与站点语言一致，不重新生成
    if (!needInitial && (!session.lang || session.lang === lang)) return;
    let cancelled = false;
    const run = async () => {
      setRegenerating(true);
      setRegenText('');
      setRegenerateError('');
      try {
        const client = getMcpClient();
        const result = await client.readTarotStream(
          {
            cards: session.cards.map((c) => ({
              id: c.id,
              name: c.name,
              isReversed: c.isReversed,
              upright: c.upright,
              element: c.element,
            })),
            question: session.question,
            background: session.background,
            spreadName: session.spreadName,
            positions: session.positions ?? [],
            lang,
          },
          { onDelta: (text) => setRegenText((prev) => prev + text), onRetry: () => setRegenText('') }
        );
        if (cancelled) return;
        if (result.success && result.narrative) {
          const updated = { ...session, interpretation: result.narrative, lang };
          setSession(updated);
          try {
            window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
          } catch { /* ignore */ }
        } else {
          setRegenerateError(result.error || t('online.interpretError'));
        }
      } catch (e) {
        if (cancelled) return;
        setRegenerateError(e instanceof Error ? e.message : t('online.interpretError'));
      } finally {
        if (!cancelled) setRegenerating(false);
      }
    };
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.lang, session?.savedAt, lang, checked]);

  // 重新生成流式文本增长时自动滚动
  useEffect(() => {
    if (regenerating && regenText) {
      regenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [regenText, regenerating]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat, asking]);

  // 板块1 基础卡牌拆解：在 Markdown 中为每张牌的解析前插入对应卡面图。
  // 注意：useMemo 必须在所有条件 return 之前调用（React hooks 规则）
  const section1Blocks = useMemo(() => {
    if (!session || !session.interpretation) return null;
    const { cards } = session;
    const interpretation = session.interpretation;
    // 找到板块1的范围。标题三语兼容：zh「板块1」/ en「Part 1」/ ja「セクション1」（服务端 SECTION_TITLES 生成）
    const startIdx = interpretation.search(
      /#{1,4}\s*(?:板块|Part|セクション)\s*1|(?:板块1|Part\s*1|セクション1)[：:]/
    );
    const endIdx = interpretation.search(
      /#{1,4}\s*(?:板块|Part|セクション)\s*[2-9]/
    );
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
    const section1 = interpretation.slice(startIdx, endIdx);

    // 按抽牌顺序逐张定位牌名（每张从上一张匹配位置之后找，避免正文引用其他牌名导致错位切分）
    type Block = { card?: DrawnCard; text: string };
    // 匹配 AI 常见输出格式："1. 牌名"、"### 2、牌名"、"*3) 牌名" 等（含 Markdown 粗体包裹）
    const numPrefix = (escName: string) =>
      new RegExp(`(?:#{1,6}\\s*)?(?:\\*\\*\\s*)?\\d{1,2}\\s*[\\.、)）]\\s*(?:\\*\\*\\s*)?\\s*${escName}`);
    const marks: { pos: number; rawLen: number; card: DrawnCard }[] = [];
    let searchFrom = 0;
    for (const card of cards) {
      if (marks.some((m) => m.card.id === card.id)) continue;
      // 解读正文中的牌名按语言由服务端本地化拼装，候选含中/英/日三名以兼容匹配
      const nameCandidates = [card.name, CARD_EN_NAMES[card.id], CARD_JA_NAMES[card.id]].filter(Boolean) as string[];
      let matched: { pos: number; rawLen: number } | null = null;
      for (const name of nameCandidates) {
        if (matched) break;
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const seg = section1.slice(searchFrom);
        const mNum = numPrefix(esc).exec(seg);
        if (mNum && mNum.index >= 0) {
          matched = { pos: searchFrom + mNum.index, rawLen: mNum[0].length };
        } else {
          const re = new RegExp(esc, 'i');
          const m = re.exec(seg);
          if (m && m.index >= 0) matched = { pos: searchFrom + m.index, rawLen: m[0].length };
        }
      }
      if (matched) {
        marks.push({ ...matched, card });
        searchFrom = matched.pos + matched.rawLen;
      }
    }
    if (marks.length < Math.min(2, cards.length)) return null;

    // 渲染时剥离块首的纯文本序号（彩色序号圆点已由 UI 提供）
    // 兼容："1. 牌名"、"### 2、牌名"、"*3) 牌名"、"第1张牌「牌名」"、"第一张牌：牌名" 等
    const stripNum = (s: string) =>
      s.replace(
        /^\s*(?:#{1,6}\s*)?(?:\*\*\s*)?(?:\d{1,2}\s*[\\.、)）]|第\s*\d{1,2}\s*张(?:牌)?[：:，,]?\s*|第[一二三四五六七八九十]{1,3}张(?:牌)?[：:，,]?\s*)(?:\*\*\s*)?/,
        ''
      );
    const blocks: Block[] = [{ text: section1BlocksIntro(section1, marks[0].pos) }];
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      // 最后一张的解析一直取到板块1结尾，保证内容完整
      const nextPos = i + 1 < marks.length ? marks[i + 1].pos : section1.length;
      blocks.push({ card: m.card, text: stripNum(section1.slice(m.pos, nextPos)).trimStart() });
    }
    return blocks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ═══ 牌阵布局：运行时几何求解（hooks 必须在所有条件 return 之前——React 规则） ═══
  const sessionN = session?.cards.length ?? 0;
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutW, setLayoutW] = useState(0);
  useEffect(() => {
    // 注意：不能用空依赖——首帧渲染的是条件 return 的占位 div（ref 为 null），
    // 牌阵容器是 session 加载后才出现的，必须每次渲染后重新探测绑定。
    const el = layoutRef.current;
    if (!el) return;
    const update = () => setLayoutW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  });
  // 自定义牌阵：格位坐标按实际用到的行列归一化（去掉空行空列留白），专用求解器保证互不遮挡
  const isCustomLayout = !!(session?.customLayout?.length && session.customLayout.length === sessionN && !session.spreadKey);
  const customLayoutCells = session?.customLayout ?? [];
  const customGeom = useMemo(() => {
    if (!isCustomLayout || !customLayoutCells.length) return null;
    // 归一化：把格位平移到从 0 开始的紧凑行列，再换算成百分比坐标
    const minRow = Math.min(...customLayoutCells.map((c) => c.row));
    const minCol = Math.min(...customLayoutCells.map((c) => c.col));
    const usedRows = Math.max(...customLayoutCells.map((c) => c.row)) - minRow + 1;
    const usedCols = Math.max(...customLayoutCells.map((c) => c.col)) - minCol + 1;
    const cells = customLayoutCells.map((c) => ({ ...c, row: c.row - minRow, col: c.col - minCol }));
    return {
      coords: cells.map((c) => ({
        x: ((c.col + 0.5) / usedCols) * 100,
        y: ((c.row + 0.5) / usedRows) * 100,
      })),
      // 高度按归一化后的实际行列求解，与坐标使用同一起点，保证行距一致
      layout: solveCustomGridLayout(cells, layoutW || 672),
      usedRows,
      usedCols,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomLayout, session, layoutW]);
  const solved = isCustomLayout && customGeom
    ? { coords: customGeom.coords, ...customGeom.layout }
    : solveSpreadLayout(session?.spreadKey ?? null, sessionN, layoutW || 672);
  const cardWPx = cardWClassToPx(solved.cardW);

  // 牌位名按站点语言实时本地化：会话里存的是抽牌时语言的牌位名，切语言后需从中文源重取
  // （hooks 必须在所有条件 return 之前——React 规则）
  const localizedPositions = useMemo(() => {
    const sk = session?.spreadKey ?? null;
    if (!session || !sk) return session?.positions ?? [];
    const zhSpread = SPREADS[sk];
    const positions = session.positions;
    if (!zhSpread || zhSpread.positions.length !== positions.length) return positions;
    return spreadPositions(sk, zhSpread.positions, lang, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, lang]);

  if (!checked) {
    return <div className="min-h-[56.25rem] w-full" />;
  }

  if (!session) {
    return (
      <PageShell
        label={t('page.reading.label')}
        title={t('session.empty.title')}
        subtitle={t('session.empty.subtitle')}
        footer={
          <button onClick={() => router.push('/online')} className="glass-btn-primary text-xs tracking-[0.25em]">
            {t('session.empty.cta')} →
          </button>
        }
      >
        <Reveal className="flex justify-center py-16">
          <Gem className="h-12 w-12 text-accent/40" aria-hidden="true" />
        </Reveal>
      </PageShell>
    );
  }

  const { cards, question, background, spreadName, positions, interpretation } = session;
  const spreadKey = session.spreadKey ?? null;

  // ═══ 牌阵展示：运行时几何求解（hooks 已移到所有条件 return 之前——React 规则） ═══
  const n = cards.length;
  const coords = solved.coords;
  // 需要横置的牌下标（当前无横置牌阵，恒为 -1）
  const crossIdx = getCrossIdx(spreadKey, n);

  // 追问：AI 始终结合客户抽过的所有牌作答（原牌阵 + 历次追问牌）
  const askFollowUp = async (overrideText?: string, extraCards?: DrawnCard[]) => {
    const q = (overrideText ?? followUp).trim();
    if (!q || asking) return;
    setFollowUp('');
    setAskError('');
    const history = chat.slice();
    // 本轮新抽的牌 = extraCards；累积的全部追问牌（去重，含本轮）
    const mergedExtra = (() => {
      const map = new Map<number, DrawnCard>();
      for (const c of allExtraCards) map.set(c.id, c);
      for (const c of extraCards ?? []) map.set(c.id, c);
      return Array.from(map.values());
    })();
    // 给 AI 的完整牌面：原牌阵在前，追问牌在后（牌名已按站点语言本地化，避免污染上下文）
    const allCardsForAI = [
      ...cards.map((c) => ({ id: c.id, name: localizedCardName(c, lang), isReversed: c.isReversed, upright: c.upright })),
      ...mergedExtra.map((c) => ({ id: c.id, name: localizedCardName(c, lang), isReversed: c.isReversed, upright: c.upright })),
    ];
    // 牌位标签：原牌位 + 追问新牌位（按站点语言）
    const extraPosLabel =
      lang === 'en' ? (i: number) => `Follow-up card ${i + 1}`
        : lang === 'ja' ? (i: number) => `追加カード${i + 1}`
        : (i: number) => `后续追问牌${i + 1}`;
    const allPositions = [
      ...localizedPositions,
      ...mergedExtra.map((_, i) => extraPosLabel(i)),
    ];
    const revLabelOf = (c: DrawnCard) => {
      if (lang === 'en') return c.isReversed ? 'Reversed' : 'Upright';
      if (lang === 'ja') return c.isReversed ? '逆位置' : '正位置';
      return c.isReversed ? '逆位' : '正位';
    };
    // 有追问牌时在问题前缀中说明背景
    const prefix =
      mergedExtra.length > 0
        ? lang === 'en'
          ? `[The querent has drawn ${mergedExtra.length} follow-up card(s) beyond the original spread (no fixed positions): ${mergedExtra.map((c) => `${localizedCardName(c, lang)} (${revLabelOf(c)})`).join(', ')}. These were drawn for extended questions around the original reading.${extraCards?.length ? ` This round, three new cards were drawn for "${q}".` : ''} Answer with ALL cards in view.]\n\n`
          : lang === 'ja'
            ? `【相談者は元のスプレッド之外に計${mergedExtra.length}枚の追加カードを引きました（固定ポジションなし）：${mergedExtra.map((c) => `${localizedCardName(c, lang)}（${revLabelOf(c)}）`).join('、')}。これらは元の質問に関する延伸の質問のために引いたものです。${extraCards?.length ? `今回、「${q}」のために新たに3枚を引きました。` : ''}すべてのカードを踏まえて回答してください。】\n\n`
            : `【问卜者在原牌阵之外先后共抽取了 ${mergedExtra.length} 张追问牌（无固定牌位）：${mergedExtra.map((c) => `${localizedCardName(c, lang)}${c.isReversed ? '逆位' : '正位'}`).join('、')}。这些是围绕原问题的延伸询问所抽的牌。${extraCards?.length ? `本轮针对「${q}」新抽了三张。` : ''}请结合全部牌面回答。】\n\n`
        : '';
    setChat([
      ...history,
      { role: 'user', content: extraCards?.length ? `${q}（附三张新牌）` : q },
    ]);
    setAsking(true);
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: allCardsForAI,
          question,
          background,
          spreadName,
          positions: allPositions,
          interpretation,
          history,
          followUp: prefix + q,
          // 追问回答语言跟随站点语言
          lang,
          // 追问语气模式：warm / sassy / tsundere
          mode: chatMode,
        }),
        signal: AbortSignal.timeout(260000),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setChat((prev) => [...prev, { role: 'assistant', content: data.answer, cards: extraCards }]);
        // 累积本轮新抽的牌，之后的普通追问也能看到它们
        if (extraCards?.length) setAllExtraCards(mergedExtra);
        setDrawnCards([]);
      } else {
        setAskError(data.error || t('online.interpretError'));
        setChat((prev) => prev.slice(0, -1)); // 移除失败的追问，让用户重发
        setFollowUp(q);
      }
    } catch {
      setAskError(t('online.interpretError'));
      setChat((prev) => prev.slice(0, -1));
      setFollowUp(q);
    } finally {
      setAsking(false);
      inputRef.current?.focus();
    }
  };

  // ═══ 后续问题抽牌：问题来自追问输入框，确定后回解读室——先亮出三张新牌，再自动解读 ═══
  const confirmFollowupDraw = () => {
    const q = followUp.trim();
    if (!q || asking) return;
    const drawn = selectedIds.map((uid) => {
      const base = TAROT_DECK.find((c) => c.id === uid)!;
      return { ...base, isReversed: Math.random() < 0.5 } as DrawnCard;
    });
    setSelectedIds([]);
    setShowDrawScene(false);
    // 先在聊天窗口内亮出三张新牌面气泡，停留片刻让客户看清，再自动开始解读
    setFollowUp('');
    setDrawnCards(drawn);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
    setTimeout(() => {
      void askFollowUp(q, drawn);
    }, 2600); // 约2.6秒：足够客户看清自己抽中了什么牌
  };

  const togglePoolCard = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <PageShell
      label={t('page.reading.label')}
      title={t('session.title')}
      subtitle={`${spreadName} · ${t('common.cardsCount', { count: cards.length })}`}
      compact
    >
      {/* 开场白 */}
      <Reveal>
        <p className="mb-14 text-center font-display text-base tracking-[0.15em] text-frost/85 sm:text-lg">
          {t('session.greeting')}
        </p>
      </Reveal>

      {/* ═══ 窗口一：牌阵展示（按牌阵位置摆放） ═══ */}
      <section className="pb-24">
        <WindowHead no="01" icon={<Gem className="h-4 w-4" />} title={t('session.window.spread')} sub={question ? `「${question}」` : undefined} />
        <Reveal>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 sm:px-7 sm:py-12">
            {/* 绝对定位容器：每张牌落在其牌阵坐标点上（高度由几何求解器精确计算） */}
            <div ref={layoutRef} className="relative mx-auto w-full max-w-2xl" style={{ height: layoutW ? solved.height : undefined, minHeight: layoutW ? undefined : 200 }}>
              {cards.map((card, idx) => {
                const p = coords[idx] ?? { x: 50, y: 50 };
                const isActive = activeCard === idx;
                const isCross = idx === crossIdx;
                // 横置交叉牌：直接用横向尺寸（宽=竖高、高=竖宽），
                // 避免 rotate(90deg) 占位（竖）与视觉（横）不一致导致牌下方留白
                const cardStyle = isCross
                  ? { width: Math.round(cardWPx * CARD_H_RATIO), height: cardWPx, transform: card.isReversed ? 'rotate(180deg)' : 'none' }
                  : { aspectRatio: '2 / 3.4', transform: card.isReversed ? 'rotate(180deg)' : 'none' };
                return (
                  <div key={idx} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <button
                      onClick={() => setActiveCard(idx)}
                      aria-label={`${localizedCardName(card, lang)} ${card.isReversed ? t('online.reversed') : t('online.upright')}`}
                      className={`relative block rounded-md transition-all duration-300 ${
                        isCross
                          ? isActive
                            ? 'z-10 ring-1 ring-accent/80 shadow-lg shadow-accent/25'
                            : 'opacity-95 hover:opacity-100'
                          : isActive
                            ? 'z-10 scale-[1.12] ring-1 ring-accent/80 shadow-lg shadow-accent/25'
                            : 'opacity-95 hover:scale-[1.06] hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`overflow-hidden rounded-md shadow-md shadow-black/50 ${isCross ? '' : solved.cardW}`}
                        style={cardStyle}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCardImage(card.id)}
                          alt={`${localizedCardName(card, lang)} ${card.isReversed ? t('online.reversed') : t('online.upright')}`}
                          className="h-full w-full object-cover"
                          loading="eager"
                        />
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium text-black">
                        {idx + 1}
                      </span>
                    </button>
                    {/* 牌位名称：绝对定位悬挂在牌下方，不占布局高度，保证同行各牌对齐 */}
                    {localizedPositions[idx] && (
                      <p className="absolute left-1/2 top-full mt-1.5 w-[8.5rem] -translate-x-1/2 truncate text-center text-[10px] leading-tight text-accent/75">
                        {localizedPositions[idx]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 当前选中牌详情 */}
            <div className="mx-auto mt-10 max-w-xl rounded-xl border border-white/[0.06] bg-black/20 px-5 py-4 text-left">
              <p className="font-display text-sm tracking-[0.1em] text-frost">
                <span className="mr-2 text-accent">{String(activeCard + 1).padStart(2, '0')}</span>
                {localizedCardName(cards[activeCard], lang)} ·{' '}
                <span className={cards[activeCard].isReversed ? 'text-muted' : 'text-accent'}>
                  {cards[activeCard].isReversed ? t('online.reversed') : t('online.upright')}
                </span>
              </p>
              {localizedPositions[activeCard] && (
                <p className="mt-0.5 text-xs text-accent/70">
                  {t('session.position')}: {localizedPositions[activeCard]}
                </p>
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {cards[activeCard].isReversed ? cards[activeCard].reversedMeaning : cards[activeCard].upright}
              </p>
              {cards.length > 1 && (
                <div className="mt-4 flex gap-1.5">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`card ${i + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCard(i);
                      }}
                      className={`h-1 w-6 rounded-full transition-colors ${i === activeCard ? 'bg-accent' : 'bg-white/15 hover:bg-white/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <SectionDivider />

      {/* ═══ 窗口二：mumu 深度解读 ═══ */}
      <section className="pb-24">
        <WindowHead no="02" icon={<Brain className="h-4 w-4" />} title={t('session.window.interpret')} />
        <Reveal delay={100}>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 sm:px-8 sm:py-10">
            {(question || background) && (
              <div className="mb-7 space-y-1.5 border-l-2 border-accent/40 pl-4 text-left">
                {question && (
                  <p className="text-sm text-frost">
                    <span className="text-xs tracking-widest text-accent/80 uppercase">{t('session.question')}: </span>
                    {question}
                  </p>
                )}
                {background && (
                  <p className="text-xs leading-relaxed text-muted">
                    <span className="tracking-widest text-accent/60 uppercase">{t('quick.bgLabel')}: </span>
                    {background}
                  </p>
                )}
              </div>
            )}
            {/* 解读生成中（SSE 流式打字机）：首次进入（正文为空）用大 logo 等待视觉；语言切换重读用轻量提示条 */}
            {regenerating && (
              <>
                {!interpretation.trim() ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <LogoSpinner size={64} />
                    <p className="mt-6 font-display text-sm tracking-[0.25em] text-frost/90 animate-pulse">
                      {t('session.generating')}
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm text-frost/90">
                    <LogoSpinner size={28} />
                    <span className="tracking-[0.1em]">{t('session.regenerating')}</span>
                  </div>
                )}
                <div
                  ref={regenRef}
                  className={`text-left leading-relaxed text-muted [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-frost [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-frost [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3.5 [&_strong]:text-frost ${!interpretation.trim() ? '' : 'mb-8 max-h-[70vh] overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-5'}`}
                >
                  <ReactMarkdown>{regenText + (regenText ? '▍' : '')}</ReactMarkdown>
                </div>
              </>
            )}
            {regenerateError && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {regenerateError}
              </div>
            )}
            {section1Blocks ? (
              /* 板块1：每张牌解析前插入对应卡面图；其余板块正常渲染 */
              <div className="text-left leading-relaxed text-muted">
                {/* 板块1之前的引言 */}
                <MarkdownBlock text={section1Blocks[0].text} />
                <div className="my-8 space-y-9 rounded-xl bg-black/15 p-5 sm:p-7">
                  {section1Blocks.slice(1).map((b, i) => {
                    const cardIdx = b.card ? cards.findIndex((c) => c.id === b.card!.id) : -1;
                    return (
                      <div key={i}>
                        {b.card && cardIdx >= 0 && (
                          <div className="mb-4 flex items-start gap-4">
                            <div
                              className="w-14 shrink-0 overflow-hidden rounded-md shadow-md shadow-black/50 sm:w-16"
                              style={{ aspectRatio: '2 / 3.4', transform: b.card.isReversed ? 'rotate(180deg)' : 'none' }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getCardImage(b.card.id)} alt={localizedCardName(b.card, lang)} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex flex-1 flex-col justify-center">
                              <span className="flex items-center gap-2">
                                {/* 序号与窗口一牌阵中的编号一致（按抽牌顺序） */}
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium leading-none text-black">
                                  {cardIdx + 1}
                                </span>
                                <span className="font-display text-sm tracking-[0.08em] text-frost">
                                  {localizedCardName(b.card, lang)} ·{' '}
                                  <span className={b.card.isReversed ? 'text-muted' : 'text-accent'}>
                                    {b.card.isReversed ? t('online.reversed') : t('online.upright')}
                                  </span>
                                </span>
                              </span>
                              {/* 牌位：这张牌在牌阵中对应回答的问题（如时间流的"过去"） */}
                              {localizedPositions[cardIdx] && (
                                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent">
                                  <Gem className="h-2.5 w-2.5" aria-hidden="true" />
                                  {t('session.position')}: {localizedPositions[cardIdx]}
                                  {question && <span className="text-accent/70">{t('session.positionLayer', { question, position: localizedPositions[cardIdx] })}</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <MarkdownBlock text={b.text} />
                      </div>
                    );
                  })}
                </div>
                {/* 板块2及之后（板块2~7 完整渲染，一次性显示） */}
                {(() => {
                  const laterStart = interpretation.search(/#{1,4}\s*(?:板块|Part|セクション)\s*[2-9]/);
                  if (laterStart === -1) return null;
                  return <MarkdownBlock text={interpretation.slice(laterStart)} />;
                })()}
              </div>
            ) : (
              <div className="text-left leading-relaxed text-muted [&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-frost [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-frost [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-frost [&_h4]:mb-3 [&_h4]:mt-6 [&_h4]:flex [&_h4]:items-center [&_h4]:gap-2.5 [&_h4]:font-display [&_h4]:text-sm [&_h4]:tracking-[0.15em] [&_h4]:text-accent [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3.5 [&_strong]:text-frost">
                <ReactMarkdown>{interpretation}</ReactMarkdown>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <SectionDivider />

      {/* ═══ 窗口三：追问问询（后续抽牌解读也在这里进行） ═══ */}
      <section id="followup-window" className="pb-24">
        <WindowHead no="03" icon={<MessageCircleQuestion className="h-4 w-4" />} title={t('session.window.followup')} sub={t('session.followup.sub')} />

        <Reveal delay={100}>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 sm:px-8 sm:py-10">

            {/* 追问语气模式切换：温柔陪伴 / 毒舌吐槽 / 嘴硬心软傲娇 */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] tracking-[0.2em] text-muted/60 uppercase">
                {t('session.modeLabel')}
              </span>
              {CHAT_MODES.map((m) => {
                const key =
                  m === 'warm' ? 'session.modeWarm' : m === 'sassy' ? 'session.modeSassy' : 'session.modeTsundere';
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setChatMode(m);
                      try {
                        window.sessionStorage.setItem(MODE_KEY, m);
                      } catch { /* 忽略持久化失败 */ }
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-300 ${
                      chatMode === m
                        ? 'border-accent/60 bg-accent/15 text-frost'
                        : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.18] hover:text-frost'
                    }`}
                  >
                    {t(key)}
                  </button>
                );
              })}
              <span className="ml-1 text-[10px] text-muted/40">{t('session.modeHint')}</span>
            </div>

            {/* 快捷追问 */}
            {chat.length === 0 && !asking && !askError && (
              <div className="mb-5 flex flex-wrap gap-2">
                {[t('session.suggest1'), t('session.suggest2'), t('session.suggest3')].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setFollowUp(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-dashed border-white/[0.12] px-3 py-1.5 text-xs text-muted transition-all hover:border-accent/40 hover:text-frost"
                  >
                    <CornerDownRight className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[26rem] space-y-5 overflow-y-auto pr-1">
              {chat.length === 0 && !asking && (
                <div className="flex items-start gap-3">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/[0.06] bg-black/25 px-4 py-3 text-left text-sm leading-relaxed text-muted">
                    {t('session.greeting')}
                  </div>
                </div>
              )}
              {chat.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm leading-relaxed text-frost">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/[0.06] bg-black/25 px-4 py-3.5 text-left text-sm leading-relaxed text-muted [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-lg [&_h1]:text-frost [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-base [&_h2]:text-frost [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:text-frost [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2.5 [&_strong]:text-frost">
                      {/* 追问抽牌解读：牌面缩小展示在解释文字上方 */}
                      {m.cards && m.cards.length > 0 && (
                        <div className="mb-4 flex items-start justify-center gap-5 border-b border-white/[0.06] pb-4 sm:gap-7">
                          {m.cards.map((c, ci) => (
                            <div key={ci} className="flex w-14 flex-col items-center gap-1.5 sm:w-16">
                              <div
                                className="w-full overflow-hidden rounded-md shadow-md shadow-black/50"
                                style={{ aspectRatio: '2 / 3.4', transform: c.isReversed ? 'rotate(180deg)' : 'none' }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getCardImage(c.id)} alt={localizedCardName(c, lang)} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                              <span className="text-center text-[10px] leading-tight text-muted">
                                {localizedCardName(c, lang)}
                                <br />
                                <span className={c.isReversed ? '' : 'text-accent/80'}>{c.isReversed ? t('online.reversed') : t('online.upright')}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                )
              )}
              {asking && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/[0.06] bg-black/25 px-4 py-3.5 text-left">
                    {/* 追问抽牌：解读等待中先把新抽的牌面亮在窗口里 */}
                    {drawnCards.length > 0 && (
                      <div className="mb-3 flex items-start justify-center gap-5 sm:gap-7">
                        {drawnCards.map((c, ci) => (
                          <div key={ci} className="flex w-14 flex-col items-center gap-1.5 sm:w-16">
                            <div
                              className="w-full overflow-hidden rounded-md shadow-md shadow-black/50"
                              style={{ aspectRatio: '2 / 3.4', transform: c.isReversed ? 'rotate(180deg)' : 'none' }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getCardImage(c.id)} alt={localizedCardName(c, lang)} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <span className="text-center text-[10px] leading-tight text-muted">
                              {localizedCardName(c, lang)}
                              <br />
                              <span className={c.isReversed ? '' : 'text-accent/80'}>{c.isReversed ? t('online.reversed') : t('online.upright')}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pl-1 text-sm text-muted">
                      <LogoSpinner size={36} />
                      {t('session.thinking')}
                    </div>
                  </div>
                </div>
              )}
              {askError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {askError}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <textarea
                ref={inputRef}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    askFollowUp();
                  }
                }}
                placeholder={t('session.followup.placeholder')}
                rows={2}
                maxLength={300}
                disabled={asking}
                className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none disabled:opacity-50"
              />
              {/* 双功能按钮：抽牌解读 / 直接发送 */}
              <div className="mt-3 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setSelectedIds([]); setShowDrawScene(true); }}
                  disabled={!followUp.trim() || asking}
                  className={`glass-btn inline-flex h-11 items-center gap-2 whitespace-nowrap text-xs ${!followUp.trim() || asking ? 'opacity-40' : ''}`}
                >
                  <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                  {t('session.drawBtnShort')}
                </button>
                <button
                  onClick={() => askFollowUp()}
                  disabled={!followUp.trim() || asking}
                  className="glass-btn-primary flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-xs disabled:opacity-40"
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                  {t('session.sendBtn')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ 追问抽牌结果已并入上方聊天窗口（牌面 + 等待解读气泡） ═══ */}
      <section className="pb-28">
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/online')}
            className="glass-btn text-xs"
          >
            <RotateCcw className="mr-2 inline-block h-3.5 w-3.5" aria-hidden="true" />{t('online.restart')}
          </button>
        </div>
      </section>

      {/* ═══ 全屏后续抽牌场景：问题已在追问输入框中填写，选三张牌 → 确定后回解读室解读 ═══ */}
      {showDrawScene && (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-[#07060a]" role="dialog" aria-modal="true">
          <p className="shrink-0 pt-5 text-center font-display text-sm tracking-[0.22em] text-frost/80 sm:text-base">
            {t('session.drawSceneTitle')}
          </p>
          {/* 显示本次要解读的问题（来自追问输入框） */}
          <p className="mx-auto mt-2 max-w-xl px-4 text-center text-xs leading-relaxed text-accent/85">
            「{followUp.trim()}」
          </p>
          <div className="tarot-scene-host relative mt-3 min-h-0 flex-1">
            <TarotScene
              maxSelect={3}
              selectedIds={selectedIds}
              onToggleCard={togglePoolCard}
            />
            {/* 底部控制栏：计数 / 返回 / 确定翻牌；z-1300 压在漂移卡牌之上 */}
            <div className="absolute bottom-0 left-0 right-0 z-[1300] flex items-center justify-center gap-x-6 gap-y-3 bg-gradient-to-t from-[rgba(7,6,10,0.88)] via-[rgba(7,6,10,0.45)] to-transparent px-4 py-4 sm:py-5">
              <div className="flex items-baseline gap-2 font-display tracking-[0.2em]">
                <span className={`text-3xl ${selectedIds.length >= 3 ? 'text-accent' : 'text-frost'}`}>
                  {selectedIds.length}
                </span>
                <span className="text-lg text-muted">/</span>
                <span className="text-lg text-muted">3</span>
              </div>
              <button
                onClick={() => { setShowDrawScene(false); setSelectedIds([]); }}
                className="glass-btn text-sm"
              >
                <RotateCcw className="mr-2 inline-block h-4 w-4" aria-hidden="true" />{t('online.flipBack')}
              </button>
              <button
                onClick={confirmFollowupDraw}
                disabled={selectedIds.length < 3 || asking}
                className={`glass-btn-primary text-sm ${selectedIds.length < 3 || asking ? 'opacity-40' : ''}`}
              >
                {asking ? (
                  <>
                    <LogoSpinner size={22} />
                    <span className="ml-2">{t('session.thinkingShort')}</span>
                  </>
                ) : (
                  <>
                    {t('online.flip')} <ChevronRight className="ml-1 inline-block h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/** 板块之间的分隔装饰线 */
function SectionDivider() {
  return (
    <Reveal>
      <div className="flex items-center justify-center gap-3" aria-hidden="true">
        <span className="hairline-glow w-16 sm:w-24" />
        <Gem className="h-3 w-3 text-accent/50" />
        <span className="hairline-glow w-16 sm:w-24" />
      </div>
    </Reveal>
  );
}

/** 板块1引言：从板块1标题到第一张牌之前（含标题行） */
function section1BlocksIntro(section1: string, firstMarkPos: number): string {
  return section1.slice(0, firstMarkPos);
}

/** 轻量 Markdown 渲染块（统一留白节奏） */
function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="[&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-frost [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:tracking-wide [&_h2]:text-frost [&_h3]:mb-2.5 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-frost [&_h4]:mb-3 [&_h4]:mt-7 [&_h4]:flex [&_h4]:items-center [&_h4]:gap-2.5 [&_h4]:font-display [&_h4]:text-sm [&_h4]:font-normal [&_h4]:tracking-[0.15em] [&_h4]:text-accent [&_li]:ml-5 [&_li]:mb-1.5 [&_li]:list-disc [&_p]:mb-4 [&_p]:leading-[1.9] [&_strong]:text-frost">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function WindowHead({ no, icon, title, sub }: { no: string; icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <Reveal className="mb-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-xs tracking-[0.3em] text-accent/70">{no}</span>
        <h2 className="font-display flex items-center gap-2 text-xl font-light tracking-[0.1em] text-frost sm:text-2xl">
          <span className="text-accent">{icon}</span>
          {title}
        </h2>
        <span className="hairline-glow hidden flex-1 sm:block" />
      </div>
      {sub && <p className="mt-3 pl-9 truncate text-xs text-muted">{sub}</p>}
    </Reveal>
  );
}
