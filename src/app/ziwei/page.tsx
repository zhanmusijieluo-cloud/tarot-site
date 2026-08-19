'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';

const MAIN_STARS = [
  { name: '紫微', pinyin: 'Ziwei', element: '土', symbol: '✶', role: '帝王 · 领导 · 权威', trait: '天生具王者之气，喜掌控大局，稳重尊贵' },
  { name: '天机', pinyin: 'Tianji', element: '木', symbol: '✦', role: '智慧 · 谋略 · 变动', trait: '聪慧灵活，思虑深远，善谋略而多变动' },
  { name: '太阳', pinyin: 'Taiyang', element: '火', symbol: '☀', role: '光明 · 博爱 · 付出', trait: '光明磊落，乐于助人，精力充沛' },
  { name: '武曲', pinyin: 'Wuqu', element: '金', symbol: '⚔', role: '财星 · 刚毅 · 决断', trait: '坚毅果敢，精于理财，实干型人才' },
  { name: '天同', pinyin: 'Tian tong', element: '水', symbol: '☾', role: '福星 · 温和 · 享受', trait: '乐天知命，性情温和，善享福泽' },
  { name: '廉贞', pinyin: 'Lianzhen', element: '木火', symbol: '❤', role: '桃花 · 刚烈 · 创造', trait: '魅力四射，感情丰富，兼具创造力与冲动' },
  { name: '天府', pinyin: 'Tianfu', element: '土', symbol: '♛', role: '财库 · 包容 · 守成', trait: '宽厚稳健，善于理财，稳中求胜' },
  { name: '太阴', pinyin: 'Taiyin', element: '水', symbol: '☽', role: '温柔 · 细腻 · 内敛', trait: '心思细腻，情感丰富，善察人心' },
  { name: '贪狼', pinyin: 'Tanlang', element: '水木', symbol: '◆', role: '欲望 · 交际 · 多元', trait: '多才多艺，长袖善舞，欲望旺盛' },
  { name: '巨门', pinyin: 'Jumen', element: '水', symbol: '◈', role: '口舌 · 洞察 · 研究', trait: '心思缜密，善辩善察，适合研究分析' },
  { name: '天相', pinyin: 'Tianxiang', element: '水', symbol: '✚', role: '辅佐 · 协调 · 贵气', trait: '公正无私，善于协调，人缘佳' },
  { name: '天梁', pinyin: 'Tianliang', element: '土', symbol: '✳', role: '荫护 · 清高 · 原则', trait: '正直清高，乐于助人，坚守原则' },
  { name: '七杀', pinyin: 'Qisha', element: '金', symbol: '✠', role: '魄力 · 决断 · 风险', trait: '敢闯敢拼，行事果断，一生多波折' },
  { name: '破军', pinyin: 'PoJun', element: '水', symbol: '✸', role: '革新 · 破旧 · 变动', trait: '敢于创新，不畏改变，破旧立新' },
];

const GONGWEI = [
  { key: '命', name: '命宫', desc: '自我 · 本性 · 人生方向', symbol: '命' },
  { key: '兄', name: '兄弟宫', desc: '手足 · 同辈 · 协作', symbol: '兄' },
  { key: '夫', name: '夫妻宫', desc: '伴侣 · 婚姻 · 感情', symbol: '夫' },
  { key: '子', name: '子女宫', desc: '子女 · 下属 · 创造', symbol: '子' },
  { key: '财', name: '财帛宫', desc: '财富 · 赚钱方式', symbol: '财' },
  { key: '疾', name: '疾厄宫', desc: '健康 · 体质 · 内在', symbol: '疾' },
  { key: '迁', name: '迁移宫', desc: '外出 · 机遇 · 人际', symbol: '迁' },
  { key: '友', name: '交友宫', desc: '朋友 · 部属 · 社交', symbol: '友' },
  { key: '官', name: '官禄宫', desc: '事业 · 成就 · 责任', symbol: '官' },
  { key: '宅', name: '田宅宫', desc: '家宅 · 不动产 · 财库', symbol: '宅' },
  { key: '福', name: '福德宫', desc: '精神 · 福报 · 享受', symbol: '福' },
  { key: '父', name: '父母宫', desc: '长辈 · 贵人 · 源头', symbol: '父' },
];

const SIHUA = [
  { name: '化禄', icon: '禄', nature: '财禄 · 顺遂 · 资源流入', guide: '能量进入上升期，抓住机遇，顺势而为' },
  { name: '化权', icon: '权', nature: '权力 · 掌控 · 主导', guide: '需要你站出来，承担更大的主动与责任' },
  { name: '化科', icon: '科', nature: '名声 · 贵人 · 助力', guide: '有人帮、被看见、获得外部加持' },
  { name: '化忌', icon: '忌', nature: '阻滞 · 考验 · 收敛', guide: '出现卡点，需修正、补短板、沉淀功课' },
];

const JUGE = [
  { name: '紫府同宫', icon: '✦', desc: '紫微与天府同守命宫，富贵双全，稳重尊贵之格' },
  { name: '机月同梁', icon: '✦', desc: '天机、太阴、天同、天梁组合，适合公职、教育、稳定行业' },
  { name: '杀破狼', icon: '✦', desc: '七杀、破军、贪狼三曜，创业闯荡、变动开创新格局' },
  { name: '阳梁昌禄', icon: '✦', desc: '太阳、天梁、文昌、化禄相会，文书官运亨通之格' },
  { name: '火贪格', icon: '✦', desc: '火星与贪狼同宫，意外横财、爆发性机遇' },
  { name: '马头带箭', icon: '✦', desc: '天马逢箭，武职显贵，能征善战之象' },
];

export default function ZiweiPage() {
  return (
    <PageShell
      label="Ziwei · Stars"
      title="紫微星垣"
      subtitle="十四主星 · 十二宫位 · 四化流转 · 格局成象"
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          命盘是先天蓝图 · 选择是后天画笔 · 星曜指向方向，脚步由你决定
        </p>
      }
    >
      {/* 十四主星 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title="十四主星 · 天命之曜" sub="紫微、天府两大星系，点击星曜窥其天命之性" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {MAIN_STARS.map((s, i) => (
            <Reveal key={s.name} delay={(i % 7) * 60}>
              <div className="group h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span
                  className="block text-xl leading-none transition-transform duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {s.symbol}
                </span>
                <span className="font-display mt-2 block text-xs tracking-[0.1em] text-frost">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.2em] text-muted/60 uppercase">
                  {s.pinyin}
                </span>
                <span className="mt-1.5 inline-block rounded-full border border-white/[0.08] px-2 py-0.5 text-[9px] text-muted/70">
                  {s.element}
                </span>
                <p className="mt-2 text-[11px] leading-snug text-muted">{s.trait}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二宫位 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title="十二宫位 · 人生之域" sub="命宫为枢，十二宫覆盖人生全部维度" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {GONGWEI.map((g, i) => (
            <Reveal key={g.key} delay={(i % 4) * 70}>
              <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-accent/25">
                <span className="font-display w-7 shrink-0 text-lg font-extralight text-accent/60">
                  {g.symbol}
                </span>
                <div>
                  <span className="font-display text-sm tracking-[0.12em] text-frost">{g.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{g.desc}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 四化 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title="四化 · 运势之钥" sub="禄权科忌 · 命运动态变化的触发点" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIHUA.map((s, i) => (
            <Reveal key={s.name} delay={i * 80}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-accent/30">
                <span className="font-display text-2xl text-accent/80">{s.icon}</span>
                <h3 className="font-display mt-3 text-base tracking-[0.15em] text-frost">
                  {s.name}
                </h3>
                <p className="mt-1 text-[12px] text-muted">{s.nature}</p>
                <div className="hairline-glow my-4 w-10" />
                <p className="text-[12px] leading-relaxed text-muted/90">{s.guide}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 经典格局 */}
      <section className="mb-8">
        <SectionHead no="04" title="经典格局 · 命局之相" sub="星曜组合形成的命运类型，反映人生大致走向" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JUGE.map((j, i) => (
            <Reveal key={j.name} delay={(i % 3) * 80}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:border-accent/25">
                <div className="flex items-center gap-2">
                  <span className="text-accent/70">{j.icon}</span>
                  <span className="font-display text-sm tracking-[0.12em] text-frost">{j.name}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{j.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
