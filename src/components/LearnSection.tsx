'use client';

const LESSONS = [
  {
    title: '塔罗入门',
    en: 'Tarot Basics',
    desc: '78 张牌的构成：22 张大阿卡纳与 56 张小阿卡纳。了解牌面如何映照内心，以及正逆位的核心含义。',
    route: '/learn',
    tag: 'Tarot',
  },
  {
    title: '大阿卡纳',
    en: 'Major Arcana',
    desc: '0 到 21 号牌的愚人之旅：从愚者到世界，22 个生命课题，对应人生不同阶段的精神成长。',
    route: '/learn',
    tag: 'Tarot',
  },
  {
    title: '四元素体系',
    en: 'Four Elements',
    desc: '权杖之火、圣杯之水、宝剑之风、星币之土——四元素如何对应行动、情感、思想与物质。',
    route: '/learn',
    tag: 'Elements',
  },
  {
    title: '雷诺曼基础',
    en: 'Lenormand',
    desc: '36 张日常符号牌，意象直白、指向精准。适合具体问题与事件走向的即时指引。',
    route: '/lenormand',
    tag: 'Lenormand',
  },
  {
    title: '占星与星盘',
    en: 'Astrology',
    desc: '行星落座与相位流转，解读性格底色与运势节奏，理解星盘作为人生地图的阅读方式。',
    route: '/astrology',
    tag: 'Astro',
  },
  {
    title: '八字命理',
    en: 'Bazi',
    desc: '天干地支、五行生克，看命局格局与大运起伏，从时间维度理解人生的节奏。',
    route: '/bazi',
    tag: 'Bazi',
  },
];

export default function LearnSection() {
  const go = (route: string) => (window.location.href = route);

  return (
    <section id="learn" className="relative border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-[90rem] px-8 py-36 sm:px-12">
        <div className="mb-24 text-center">
          <p className="text-xs tracking-[0.4em] text-accent/70 uppercase">Academy</p>
          <h2 className="font-display mt-8 text-5xl font-light tracking-[0.12em] text-frost sm:text-6xl">
            学习资料
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            塔罗、雷诺曼、占星、八字——从零开始的系统学习卡片，随时查阅。
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {LESSONS.map((l) => (
            <button
              key={l.title}
              onClick={() => go(l.route)}
              className="group rounded-2xl border border-white/[0.06] bg-black/20 p-10 text-left transition-all duration-300 hover:border-accent/30 hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.3em] text-accent/70 uppercase">{l.tag}</span>
                <span className="text-[10px] tracking-[0.25em] text-muted/60 uppercase">{l.en}</span>
              </div>
              <h3 className="font-display mt-8 text-2xl tracking-[0.1em] text-frost transition-colors group-hover:text-accent-soft">
                {l.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{l.desc}</p>
              <span className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.12em] text-accent/80 transition-all group-hover:gap-4">
                前往学习 <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
