'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { TAROT_DECK } from '@/lib/tarot';

const SUITS = ['major', 'wands', 'cups', 'swords', 'pentacles'] as const;
const SUIT_NAMES: Record<string, string> = {
  major: '大阿卡纳',
  wands: '权杖',
  cups: '圣杯',
  swords: '宝剑',
  pentacles: '星币',
};

export default function LearnPage() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  const SECTIONS = [
    { id: 'intro', icon: '🌟', title: '塔罗入门', desc: '了解塔罗的历史渊源、基本结构与使用原则', route: null },
    { id: 'major', icon: '🃏', title: '大阿卡纳详解', desc: '学习 22 张大阿卡纳牌的含义与象征', route: '/tarot' },
    { id: 'minor', icon: '✦', title: '小阿卡纳解析', desc: '掌握四组牌组的元素属性与数字意义', route: null },
    { id: 'spreads', icon: '🔮', title: '牌阵基础', desc: '学习常见的塔罗牌阵及其解读方法', route: '/spreads' },
    { id: 'elements', icon: '🔥', title: '四元素理论', desc: '理解火水土风四大元素的象征意义', route: null },
    { id: 'astro', icon: '⭐', title: '占星对应', desc: '探索塔罗牌与星座、行星的对应关系', route: '/astrology' },
    { id: 'practice', icon: '📚', title: '实战技巧', desc: '掌握塔罗占卜的实际操作技巧与注意事项', route: null },
    { id: 'myth', icon: '🏛️', title: '神话原型', desc: '探索塔罗牌背后的神话故事与文化原型', route: null },
  ];

  return (
    <PageShell
      label="Learn · Knowledge"
      title="学习专区"
      subtitle="从入门到精通，系统学习塔罗智慧"
      wide
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          「塔罗不是预言，而是反映你内心深处的镜子」
        </p>
      }
    >
      {/* 课程卡片 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title="学习路径" sub="八个模块，从入门到精通" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * 70}>
              {s.route ? (
                <button
                  onClick={() => router.push(s.route)}
                  className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]"
                >
                  <span className="text-xl opacity-80 transition-transform duration-300 group-hover:scale-110">
                    {s.icon}
                  </span>
                  <h3 className="font-display mt-3 text-sm tracking-[0.12em] text-frost">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{s.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs tracking-[0.1em] text-accent/80 transition-all group-hover:gap-2">
                    进入学习 →
                  </span>
                </button>
              ) : (
                <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <span className="text-xl opacity-80">{s.icon}</span>
                  <h3 className="font-display mt-3 text-sm tracking-[0.12em] text-frost">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{s.desc}</p>
                  <span className="mt-3 block text-xs tracking-[0.1em] text-muted/60">待续</span>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* 元素详解 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title="四元素理论" sub="火、水、风、土 — 构成宇宙万物的四种基本能量" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: '权杖 · 火', en: 'Wands · Fire', icon: '🔥', color: '#e8a08a',
              desc: '行动、热情、创造力。掌管生命活力与行动力，象征欲望的燃烧与事业的开拓。'},
            { name: '圣杯 · 水', en: 'Cups · Water', icon: '💧', color: '#8aa8d8',
              desc: '情感、直觉、联结。掌管情感世界与心灵流动，象征爱的滋养与直觉的浪潮。'},
            { name: '宝剑 · 风', en: 'Swords · Air', icon: '🌪️', color: '#9cc3d8',
              desc: '思想、沟通、冲突。掌管理性与言语，象征思维的锋芒与人际的博弈。'},
            { name: '星币 · 土', en: 'Pentacles · Earth', icon: '🪙', color: '#cdb88a',
              desc: '物质、现实、财富。掌管物质世界与身体，象征财富的积累与生活的踏实。'},
          ].map((el, i) => (
            <Reveal key={el.name} delay={i * 90}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12]">
                <span className="text-2xl">{el.icon}</span>
                <h3 className="font-display mt-3 text-sm tracking-[0.1em] text-frost">{el.name}</h3>
                <span className="text-[9px] tracking-[0.25em] text-muted/60 uppercase">{el.en}</span>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">{el.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 牌库速查 */}
      <section className="mb-8">
        <SectionHead no="03" title="牌库速查" sub="22 张大阿卡纳 · 四组小阿卡纳 · 点击展开" />
        <div className="space-y-4">
          {SUITS.map((suit) => {
            const cards = TAROT_DECK.filter((c) =>
              suit === 'major' ? c.id <= 21 : c.element === { wands: '火', cups: '水', swords: '风', pentacles: '土' }[suit]
            );
            if (cards.length === 0) return null;
            return (
              <Reveal key={suit}>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setActive(active === suit ? null : suit)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="font-display text-xs tracking-[0.2em] text-muted uppercase">
                      {SUIT_NAMES[suit]} · {cards.length} 张
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${active === suit ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {active === suit && (
                    <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-5 md:grid-cols-7">
                      {cards.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-center"
                        >
                          <span className="block text-sm">{c.emoji}</span>
                          <span className="mt-1 block text-[9px] leading-tight text-muted">{c.name}</span>
                        </div>
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
