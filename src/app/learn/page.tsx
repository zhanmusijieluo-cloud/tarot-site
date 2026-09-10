'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { TAROT_DECK, getCardImage } from '@/lib/tarot';
import { useI18n } from '@/i18n';

const SUITS = ['major', 'wands', 'swords', 'pentacles', 'cups', 'court'] as const;
const SUIT_NAMES: Record<string, string> = {
  major: 'suit.major',
  wands: 'suit.wands',
  cups: 'suit.cups',
  swords: 'suit.swords',
  pentacles: 'suit.pentacles',
  court: 'suit.court',
};

/** 宫廷牌：Page/Knight/Queen/King */
const COURT_NUMERALS = new Set(['Page', 'Knight', 'Queen', 'King']);

export default function LearnPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [activeSuit, setActiveSuit] = useState<string | null>(null);

  // 学习路径：实战技巧已上线（读库），神话原型待续
  const SECTIONS: { id: string; icon: string; titleKey: string; descKey: string; route: string | null }[] = [
    { id: 'practice', icon: '📚', titleKey: 'learn.section.practice', descKey: 'learn.desc.practice', route: '/learn/practice' },
    { id: 'myth', icon: '🏛️', titleKey: 'learn.section.myth', descKey: 'learn.desc.myth', route: '/learn/myth' },
  ];

  return (
    <PageShell
      label={t('page.learn.label')}
      title={t('page.learn.title')}
      subtitle={t('page.learn.subtitle')}
      wide
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          {t('page.learn.footer')}
        </p>
      }
    >
      {/* 学习路径：实战技巧与神话原型 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title={t('learn.pathSection')} sub={t('learn.pathSub')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * 70}>
              <div
                onClick={() => s.route && router.push(s.route)}
                className={`h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 ${s.route ? 'cursor-pointer hover:border-accent/30 hover:bg-accent/[0.04]' : ''}`}
              >
                <span className="text-xl opacity-80">{s.icon}</span>
                <h3 className="font-display mt-3 text-sm tracking-[0.12em] text-frost">
                  {t(s.titleKey)}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{t(s.descKey)}</p>
                <span className="mt-3 block text-xs tracking-[0.1em] text-muted/60">
                  {s.route ? `${t('learn.enter')} →` : t('learn.comingSoon')}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 牌库速查：韦特牌面 + 详细解释 */}
      <section className="mb-8">
        <SectionHead no="02" title={t('learn.deckSection')} sub={t('learn.deckSub')} />
        <div className="space-y-3">
          {SUITS.map((suit) => {
            // 分组规则：大阿卡纳 id 0-21；四花色数字牌 1-10（元素对应）；宫廷牌（Page/Knight/Queen/King）
            const cards =
              suit === 'major'
                ? TAROT_DECK.filter((c) => c.id <= 21)
                : suit === 'court'
                  ? TAROT_DECK.filter((c) => c.id > 21 && COURT_NUMERALS.has(c.numeral))
                  : TAROT_DECK.filter(
                      (c) =>
                        c.id > 21 &&
                        !COURT_NUMERALS.has(c.numeral) &&
                        c.element === { wands: '火', swords: '风', pentacles: '土', cups: '水' }[suit]
                    );
            if (cards.length === 0) return null;
            return (
              <Reveal key={suit}>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setActiveSuit(activeSuit === suit ? null : suit)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="font-display text-xs tracking-[0.2em] text-muted uppercase">
                      {t(SUIT_NAMES[suit])} · {t('common.cardsCount', { count: cards.length })}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${activeSuit === suit ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {activeSuit === suit && (
                    <div className="grid grid-cols-3 gap-4 p-5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8">
                      {cards.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => router.push(`/learn/card/${c.id}`)}
                          className="group flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 transition-all duration-200 hover:border-accent/40 hover:bg-accent/[0.05]"
                        >
                          <div className="w-full overflow-hidden rounded-md shadow-md shadow-black/30 transition-transform duration-200 group-hover:scale-105"
                            style={{ aspectRatio: '2 / 3.4' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCardImage(c.id)}
                              alt={c.name + (lang === 'en' ? ` (${c.id})` : '')}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <span className="text-center text-[9px] leading-tight text-muted group-hover:text-frost">{t(`card.${c.id}`)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}