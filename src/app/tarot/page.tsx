'use client';

import { useState } from 'react';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { TAROT_DECK, type TarotCard } from '@/lib/tarot';
import { useRouter } from 'next/navigation';

const MAJORS = TAROT_DECK.filter((c) => c.id <= 21);

const ELEMENTS = [
  {
    icon: '🔥',
    name: '权杖 · 火',
    en: 'Wands · Fire',
    keywords: '行动、热情、创造力',
    desc: '掌管生命活力与行动力，象征欲望的燃烧与事业的开拓',
  },
  {
    icon: '💧',
    name: '圣杯 · 水',
    en: 'Cups · Water',
    keywords: '情感、直觉、联结',
    desc: '掌管情感世界与心灵流动，象征爱的滋养与直觉的浪潮',
  },
  {
    icon: '🌪️',
    name: '宝剑 · 风',
    en: 'Swords · Air',
    keywords: '思想、沟通、冲突',
    desc: '掌管理性与言语，象征思维的锋芒与人际的博弈',
  },
  {
    icon: '🪙',
    name: '星币 · 土',
    en: 'Pentacles · Earth',
    keywords: '物质、现实、财富',
    desc: '掌管物质世界与身体，象征财富的积累与生活的踏实',
  },
];

const ENTRIES = [
  { icon: '🔮', name: '在线占卜', desc: '静心默念问题，由智能塔罗师为你抽牌', route: '/online' },
  { icon: '✦', name: '推荐牌阵', desc: '感情 · 财运 · 事业三大维度精选牌阵', route: '/spreads' },
  { icon: '🌙', name: '每日运势', desc: '每天一张牌，聆听宇宙的低语', route: '/daily' },
  { icon: '📚', name: '学习专区', desc: '从入门到精通，系统掌握塔罗智慧', route: '/learn' },
];

export default function TarotPage() {
  const router = useRouter();
  const [active, setActive] = useState<TarotCard | null>(null);

  return (
    <PageShell
      label="Tarot · Arcana"
      title="塔罗秘境"
      subtitle="22 张大阿卡纳 · 四元素真谛 · 命运的低语"
      wide
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          TAROT · MAJOR ARCANA · FOUR ELEMENTS
        </p>
      }
    >
      {/* 入口 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.name} delay={i * 80}>
              <button
                onClick={() => router.push(e.route)}
                className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.06] sm:p-5"
              >
                <span className="text-lg opacity-80 transition-transform duration-300 group-hover:scale-110">
                  {e.icon}
                </span>
                <p className="font-display mt-2.5 text-sm tracking-[0.15em] text-frost">
                  {e.name}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{e.desc}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 大阿卡纳 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead
          no="01"
          title="大阿卡纳 · 命运之路"
          sub="22 张牌 · 22 个生命课题 · 点击卡片查看正逆位真义"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {MAJORS.map((c, i) => (
            <Reveal key={c.id} delay={(i % 6) * 60}>
              <button
                onClick={() => setActive(c)}
                className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-accent/[0.05] hover:shadow-glow"
              >
                <span className="font-display block text-[10px] tracking-[0.25em] text-muted/70">
                  {c.numeral}
                </span>
                <span className="my-2.5 block text-2xl transition-transform duration-300 group-hover:scale-110">
                  {c.emoji}
                </span>
                <span className="font-display block text-sm tracking-[0.1em] text-frost">
                  {c.name}
                </span>
                <span className="mt-1.5 block text-[11px] leading-snug text-muted">
                  {c.keywords.slice(0, 2).join(' · ')}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 四元素 */}
      <section className="mb-8">
        <SectionHead no="02" title="四元素真谛" sub="小阿卡纳的四组牌组，对应宇宙四种基本能量" />
        <div className="grid gap-4 sm:grid-cols-2">
          {ELEMENTS.map((el, i) => (
            <Reveal key={el.name} delay={i * 90}>
              <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-accent/25 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                    {el.icon}
                  </span>
                  <span className="text-[9px] tracking-[0.3em] text-muted/60 uppercase">
                    {el.en}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-base tracking-[0.15em] text-frost">
                  {el.name}
                </h3>
                <p className="mt-1 text-xs tracking-wide text-accent/80">{el.keywords}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{el.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 牌义详情浮层 */}
      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
          onClick={() => setActive(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="glass-panel relative w-full max-w-sm rounded-3xl p-7 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'rise-in 0.5s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <span className="font-display block text-[10px] tracking-[0.3em] text-muted/70">
              {active.numeral} · {active.element} · {active.zodiac || '—'}
            </span>
            <span className="my-4 block text-4xl">{active.emoji}</span>
            <h3 className="font-display text-xl tracking-[0.2em] text-frost">{active.name}</h3>
            <div className="hairline-glow mx-auto my-5 w-20" />
            <div className="space-y-4 text-left">
              <div>
                <p className="mb-1.5 text-[10px] tracking-[0.3em] text-accent/80 uppercase">
                  Upright · 正位
                </p>
                <p className="text-[13px] leading-relaxed text-frost/85">{active.upright}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] tracking-[0.3em] text-muted uppercase">
                  Reversed · 逆位
                </p>
                <p className="text-[13px] leading-relaxed text-muted">{active.reversedMeaning}</p>
              </div>
            </div>
            <button
              onClick={() => setActive(null)}
              className="glass-btn mt-6 w-full text-xs tracking-[0.2em]"
            >
              合上牌义
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
