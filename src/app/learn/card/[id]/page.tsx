'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { TAROT_DECK, getCardImage } from '@/lib/tarot';
import { localizedCardName } from '@/lib/card-names';
import { useI18n } from '@/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** 牌详解数据类型（与 card-details.ts 一致） */
interface CardLangContent {
  symbolism: string;
  core: string;
  upright: string;
  reversed: string;
  love: string;
  career: string;
  wealth: string;
  health: string;
  keywords: string[];
  advice: string;
  myth?: string;
  journey?: string;
  colorSymbolism?: string;
  numerology?: string;
  yesno?: string;
  meditation?: string;
  correspondences?: string;
}
interface CardDetails {
  id: number;
  zh: CardLangContent;
  en: CardLangContent;
  ja: CardLangContent;
}

/** 板块元数据：键名 → 翻译键 → 图标 */
const BLOCKS = [
  { key: 'symbolism', icon: '🖼️' },
  { key: 'core', icon: '💠' },
  { key: 'upright', icon: '☀️' },
  { key: 'reversed', icon: '🌙' },
  { key: 'love', icon: '❤️' },
  { key: 'career', icon: '💼' },
  { key: 'wealth', icon: '💰' },
  { key: 'health', icon: '🌿' },
  { key: 'advice', icon: '✨' },
  { key: 'myth', icon: '🏛️' },
  { key: 'journey', icon: '🧭' },
  { key: 'colorSymbolism', icon: '🎨' },
  { key: 'numerology', icon: '🔢' },
  { key: 'yesno', icon: '⚖️' },
  { key: 'meditation', icon: '🧘' },
  { key: 'correspondences', icon: '🔮' },
];

export default function CardDetailPage() {
  const { id } = useParams();
  const cardId = parseInt(String(id), 10);
  const router = useRouter();
  const { t, lang } = useI18n();
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 返回 = 撤销一步历史(浏览器返回键才能正确跳出本板块); 直链进入无历史时兜底跳牌库
  const backToDeck = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/learn');
  };
  // 上/下一张 = 替换当前历史记录, 不往栈里摞牌
  const goCard = (target: number) => router.replace(`/learn/card/${target}`);

  // 运行时加载 JSON 数据（避免大文件进构建产物，加快编译）
  useEffect(() => {
    let cancelled = false;
    fetch('/data/card-details.json')
      .then((r) => r.json())
      .then((all: CardDetails[]) => {
        if (cancelled) return;
        setDetails(all.find((d) => d.id === cardId) || null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(null);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const card = TAROT_DECK.find((c) => c.id === cardId);

  if (!card) {
    return (
      <PageShell label={t('page.learn.label')} title={t('page.learn.title')}>
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <p className="text-4xl opacity-60">🕯️</p>
          <p className="text-lg text-muted">Card not found</p>
          <Link href="/learn" className="text-accent underline underline-offset-4">
            ← {t('common.back')}
          </Link>
        </div>
      </PageShell>
    );
  }

  const langKey = lang as 'zh' | 'en' | 'ja';
  const displayName = localizedCardName(card, lang);
  const prev = TAROT_DECK[(cardId - 1 + 78) % 78];
  const next = TAROT_DECK[(cardId + 1) % 78];
  const nextName = localizedCardName(next, lang);
  const prevName = localizedCardName(prev, lang);

  // 数据加载中
  if (!loaded) {
    return (
      <PageShell label={t('page.learn.label')} title={displayName} wide>
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        </div>
      </PageShell>
    );
  }

  // 数据未找到（牌有图但暂无详解数据）
  if (!details) {
    return (
      <PageShell label={t('page.learn.label')} title={displayName} wide>
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <p className="text-4xl opacity-60">🕯️</p>
          <p className="text-lg text-muted">{displayName}</p>
          <Link href="/learn" className="text-accent underline underline-offset-4">
            ← {t('learn.detail.back')}
          </Link>
        </div>
      </PageShell>
    );
  }

  const content = details[langKey];

  return (
    <PageShell
      label={t('learn.detail.label')}
      title={displayName}
      subtitle={card.name + (lang !== 'zh' ? ` · ${card.name}` : '')}
      wide
    >
      {/* 返回牌库 */}
      <div className="mb-10">
        <button
          onClick={backToDeck}
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] text-muted transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" /> {t('learn.detail.back')}
        </button>
      </div>

      {/* 顶部：牌面 + 关键信息 */}
      <section className="grid gap-10 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Reveal>
          <div className="mx-auto w-full max-w-[340px] lg:sticky lg:top-28">
            <div
              className="w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10"
              style={{ aspectRatio: '2 / 3.4' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getCardImage(cardId)} alt={displayName} className="h-full w-full object-cover" />
            </div>
            {/* 牌面标签 */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] tracking-[0.15em] text-muted/80">
                {card.element} · {card.zodiac || '—'}
              </span>
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] tracking-[0.15em] text-muted/80">
                {card.numeral}
              </span>
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] tracking-[0.15em] text-muted/80">
                {t(`card.${cardId}`)}
              </span>
            </div>
            {/* 关键词 */}
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {content.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-muted"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 右侧：详细板块 */}
        <div className="min-w-0 space-y-8">
          {BLOCKS.map((block, i) => {
            const text = (content as unknown as Record<string, unknown>)[block.key];
            // 只有存在内容的板块才渲染
            if (!text || (Array.isArray(text) && text.length === 0)) return null;
            const isArray = Array.isArray(text);
            return (
              <Reveal key={block.key} delay={Math.min((i % 4) * 60, 180)}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-base">
                      {block.icon}
                    </span>
                    <span className="font-display text-sm tracking-[0.18em] text-frost uppercase">
                      {t(`learn.detail.${block.key}`)}
                    </span>
                  </h3>
                  {isArray ? (
                    <div className="flex flex-wrap gap-2">
                      {(text as string[]).map((item, j) => (
                        <span
                          key={j}
                          className="rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-xs text-frost/90"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(text as string)
                        .split('\n')
                        .filter((p) => p.trim().length > 0)
                        .map((para, j) => (
                          <p key={j} className="text-[13px] leading-[1.9] text-muted/90">
                            {para}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}

          {/* 牌面速查卡：正逆位 + 一句提醒 */}
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm tracking-[0.15em] text-frost">
                  <span className="text-base">☀️</span> {t('learn.uprightLabel')}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted/90">{card.upright}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm tracking-[0.15em] text-frost">
                  <span className="text-base">🌙</span> {t('learn.reversedLabel')}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted/90">{card.reversedMeaning}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 上下张导航 */}
      <div className="mt-16 grid gap-3 border-t border-white/[0.06] pt-8 sm:grid-cols-2">
        <button
          onClick={() => goCard(prev.id)}
          className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-accent/30 hover:bg-accent/[0.05]"
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:-translate-x-1" />
          <span className="min-w-0">
            <span className="block text-[10px] tracking-[0.2em] text-muted/60 uppercase">
              {t('learn.detail.prev')}
            </span>
            <span className="block truncate text-sm text-frost">{prevName}</span>
          </span>
        </button>
        <button
          onClick={() => goCard(next.id)}
          className="group flex items-center justify-end gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-right transition-all hover:border-accent/30 hover:bg-accent/[0.05]"
        >
          <span className="min-w-0">
            <span className="block text-[10px] tracking-[0.2em] text-muted/60 uppercase">
              {t('learn.detail.next')}
            </span>
            <span className="block truncate text-sm text-frost">{nextName}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </PageShell>
  );
}
