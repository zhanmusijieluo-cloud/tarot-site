'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useRouter } from 'next/navigation';

const CARDS = [
  { no: '01', icon: '🐎', name: '骑手', en: 'Rider', keywords: '消息、访客、新动向' },
  { no: '02', icon: '🍀', name: '三叶草', en: 'Clover', keywords: '小幸运、短暂机会' },
  { no: '03', icon: '⛵', name: '船', en: 'Ship', keywords: '旅行、远方、贸易' },
  { no: '04', icon: '🏠', name: '房子', en: 'House', keywords: '家庭、稳定、根基' },
  { no: '05', icon: '🌳', name: '树', en: 'Tree', keywords: '健康、成长、生命力' },
  { no: '06', icon: '☁️', name: '云', en: 'Clouds', keywords: '困惑、不确定、迷雾' },
  { no: '07', icon: '🐍', name: '蛇', en: 'Snake', keywords: '诱惑、背叛、智慧' },
  { no: '08', icon: '⚰️', name: '棺材', en: 'Coffin', keywords: '结束、停滞、转化' },
  { no: '09', icon: '💐', name: '花束', en: 'Bouquet', keywords: '礼物、欣赏、美好' },
  { no: '10', icon: '🌾', name: '镰刀', en: 'Scythe', keywords: '切割、决断、突袭' },
  { no: '11', icon: '🪢', name: '鞭子', en: 'Whip', keywords: '争执、重复、竞争' },
  { no: '12', icon: '🕊️', name: '鸟', en: 'Birds', keywords: '交谈、忧虑、沟通' },
  { no: '13', icon: '🧒', name: '孩子', en: 'Child', keywords: '纯真、新的开始、小事' },
  { no: '14', icon: '🦊', name: '狐狸', en: 'Fox', keywords: '职场、机敏、防骗' },
  { no: '15', icon: '🐻', name: '熊', en: 'Bear', keywords: '力量、财富、守护者' },
  { no: '16', icon: '⭐', name: '星', en: 'Star', keywords: '希望、指引、灵感' },
  { no: '17', icon: '🦩', name: '鹳', en: 'Stork', keywords: '转变、搬迁、更新' },
  { no: '18', icon: '🐕', name: '狗', en: 'Dog', keywords: '忠诚、朋友、信任' },
  { no: '19', icon: '🗼', name: '塔', en: 'Tower', keywords: '机构、孤立、界限' },
  { no: '20', icon: '🌳', name: '公园', en: 'Park', keywords: '社交、公共、聚会' },
  { no: '21', icon: '⛰️', name: '山', en: 'Mountain', keywords: '阻碍、挑战、考验' },
  { no: '22', icon: '🛤️', name: '十字路口', en: 'Crossroad', keywords: '选择、分岔、抉择' },
  { no: '23', icon: '🐁', name: '老鼠', en: 'Mice', keywords: '损耗、焦虑、侵蚀' },
  { no: '24', icon: '💗', name: '心', en: 'Heart', keywords: '爱情、情感、亲密' },
  { no: '25', icon: '💍', name: '戒指', en: 'Ring', keywords: '承诺、契约、循环' },
  { no: '26', icon: '📖', name: '书', en: 'Book', keywords: '知识、秘密、学习' },
  { no: '27', icon: '✉️', name: '信', en: 'Letter', keywords: '文件、消息、沟通' },
  { no: '28', icon: '🤵', name: '男人', en: 'Man', keywords: '男性、当事人、行动者' },
  { no: '29', icon: '👗', name: '女人', en: 'Woman', keywords: '女性、当事人、感知者' },
  { no: '30', icon: '🌺', name: '百合', en: 'Lily', keywords: '成熟、平和、美德' },
  { no: '31', icon: '☀️', name: '太阳', en: 'Sun', keywords: '成功、活力、光明' },
  { no: '32', icon: '🌙', name: '月亮', en: 'Moon', keywords: '情绪、直觉、声誉' },
  { no: '33', icon: '🗝️', name: '钥匙', en: 'Key', keywords: '解决、关键、开启' },
  { no: '34', icon: '🐟', name: '鱼', en: 'Fish', keywords: '财富、生意、流动' },
  { no: '35', icon: '⚓', name: '锚', en: 'Anchor', keywords: '稳定、坚持、归宿' },
  { no: '36', icon: '✝️', name: '十字', en: 'Cross', keywords: '考验、使命、负担' },
];

export default function LenormandPage() {
  const router = useRouter();

  return (
    <PageShell
      label="Lenormand · 36 Cards"
      title="雷诺曼"
      subtitle="源自十九世纪的符号之牌 · 意象直白 · 指向精准"
      wide
      footer={
        <button
          onClick={() => router.push('/online')}
          className="glass-btn-primary text-xs tracking-[0.25em]"
        >
          开始占卜 →
        </button>
      }
    >
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead
          no="01"
          title="36 张符号之牌"
          sub="每张牌都是一个生活意象：从「骑手」到「十字」，组合读牌时形成故事般的指引"
        />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
          {CARDS.map((c, i) => (
            <Reveal key={c.no} delay={(i % 9) * 55}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05] hover:-translate-y-1">
                <span className="text-base">{c.icon}</span>
                <span className="mt-1.5 font-display text-xs tracking-[0.1em] text-frost">
                  {c.name}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.2em] text-muted/60 uppercase">
                  {c.en}
                </span>
                <span className="mt-2 block text-[10px] leading-snug text-muted/80">
                  {c.keywords.split('、').slice(0, 2).join(' · ')}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHead no="02" title="读牌心法" sub="两张牌可快速合成一个意象；三张牌展开为一句简短提示" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: '象意直读', desc: '雷诺曼不依赖象征隐喻，直接按字面组合理解，贴近日常生活直觉' },
            { title: '位置逻辑', desc: '从左到右读为事件的时间线；中央牌为主题核心' },
            { title: '镜像法则', desc: '左右对称的两张牌互相补充；相邻牌互相修饰影响' },
          ].map((m, i) => (
            <Reveal key={m.title} delay={i * 100}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="font-display text-sm tracking-[0.15em] text-frost">{m.title}</h3>
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
