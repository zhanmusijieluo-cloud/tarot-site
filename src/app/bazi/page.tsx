'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';

const PILLARS = [
  { key: 'year', name: '年柱', en: 'Year', subject: '祖辈荫德 · 早年根基', scope: '社会格局' },
  { key: 'month', name: '月柱', en: 'Month', subject: '父母手足 · 青年运势', scope: '事业提纲' },
  { key: 'day', name: '日柱', en: 'Day', subject: '日主本我 · 婚姻宫', scope: '核心自我' },
  { key: 'hour', name: '时柱', en: 'Hour', subject: '子女晚年 · 归宿', scope: '人生归宿' },
];

const TIANGAN = [
  { char: '甲', pinyin: 'Jiǎ', yinyang: '阳', element: '木', nature: '参天大树 · 向上生长' },
  { char: '乙', pinyin: 'Yǐ', yinyang: '阴', element: '木', nature: '藤蔓花卉 · 柔韧攀附' },
  { char: '丙', pinyin: 'Bǐng', yinyang: '阳', element: '火', nature: '太阳烈火 · 照亮万物' },
  { char: '丁', pinyin: 'Dīng', yinyang: '阴', element: '火', nature: '烛火炉焰 · 温柔持久' },
  { char: '戊', pinyin: 'Wù', yinyang: '阳', element: '土', nature: '高山厚土 · 稳固承载' },
  { char: '己', pinyin: 'Jǐ', yinyang: '阴', element: '土', nature: '田园湿土 · 孕育滋养' },
  { char: '庚', pinyin: 'Gēng', yinyang: '阳', element: '金', nature: '刀剑钢铁 · 刚毅决绝' },
  { char: '辛', pinyin: 'Xīn', yinyang: '阴', element: '金', nature: '珠玉珠宝 · 精致细腻' },
  { char: '壬', pinyin: 'Rén', yinyang: '阳', element: '水', nature: '江海洪流 · 奔涌不息' },
  { char: '癸', pinyin: 'Guǐ', yinyang: '阴', element: '水', nature: '雨露霜雪 · 润泽无声' },
];

const DIZHI = [
  { char: '子', animal: '鼠', element: '水', time: '23-1时' },
  { char: '丑', animal: '牛', element: '土', time: '1-3时' },
  { char: '寅', animal: '虎', element: '木', time: '3-5时' },
  { char: '卯', animal: '兔', element: '木', time: '5-7时' },
  { char: '辰', animal: '龙', element: '土', time: '7-9时' },
  { char: '巳', animal: '蛇', element: '火', time: '9-11时' },
  { char: '午', animal: '马', element: '火', time: '11-13时' },
  { char: '未', animal: '羊', element: '土', time: '13-15时' },
  { char: '申', animal: '猴', element: '金', time: '15-17时' },
  { char: '酉', animal: '鸡', element: '金', time: '17-19时' },
  { char: '戌', animal: '狗', element: '土', time: '19-21时' },
  { char: '亥', animal: '猪', element: '水', time: '21-23时' },
];

const WUXING_SHENG = [
  { from: '木', to: '火', reason: '木燃生火' },
  { from: '火', to: '土', reason: '灰烬成土' },
  { from: '土', to: '金', reason: '土中藏金' },
  { from: '金', to: '水', reason: '金凝生水' },
  { from: '水', to: '木', reason: '水润木生' },
];

const WUXING_KE = [
  { from: '木', to: '土', reason: '木根固土' },
  { from: '土', to: '水', reason: '水来土掩' },
  { from: '水', to: '火', reason: '水能灭火' },
  { from: '火', to: '金', reason: '火可熔金' },
  { from: '金', to: '木', reason: '金可伐木' },
];

const SHISHEN = [
  { name: '正印', icon: '✦', desc: '生我者', role: '母亲 · 学识 · 庇护', type: '吉' },
  { name: '偏印', icon: '◆', desc: '同性相生', role: '偏门智慧 · 非常规', type: '中性' },
  { name: '正官', icon: '✦', desc: '克我者', role: '事业 · 规则 · 责任', type: '吉' },
  { name: '七杀', icon: '◆', desc: '同性相克', role: '压力 · 突破 · 魄力', type: '警示' },
  { name: '正财', icon: '✦', desc: '我克者', role: '稳定收入 · 务实', type: '吉' },
  { name: '偏财', icon: '◆', desc: '同性相克', role: '意外之财 · 大方', type: '中性' },
  { name: '食神', icon: '✦', desc: '我生者', role: '才华 · 口福 · 享受', type: '吉' },
  { name: '伤官', icon: '◆', desc: '同性相生', role: '创造力 · 张扬', type: '警示' },
  { name: '比肩', icon: '✦', desc: '同我者', role: '兄弟姐妹 · 自我', type: '中性' },
  { name: '劫财', icon: '◆', desc: '异性同我', role: '竞争 · 豪爽', type: '警示' },
];

const ELEMENT_DOT: Record<string, string> = {
  '木': '#7dba6e',
  '火': '#d4766e',
  '土': '#cdb88a',
  '金': '#d0c8b0',
  '水': '#7ca8d4',
};

export default function BaziPage() {
  return (
    <PageShell
      label="Bazi · Four Pillars"
      title="八字乾坤"
      subtitle="四柱八字 · 阴阳五行 · 十神真义 · 大运流转"
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          命盘为静，运途为动。大运流年如四季更迭，顺势而为，方为上策。
        </p>
      }
    >
      {/* 四柱 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title="四柱 · 命之框架" sub="年、月、日、时四根柱子，构成命运的蓝图" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.key} delay={i * 90}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center transition-all duration-300 hover:border-accent/25">
                <span className="font-display text-[10px] tracking-[0.3em] text-accent/60 uppercase">
                  {p.en}
                </span>
                <span className="mt-2 block font-display text-lg tracking-[0.15em] text-frost">
                  {p.name}
                </span>
                <div className="hairline-glow mx-auto my-3 w-10" />
                <p className="text-[12px] text-muted">{p.subject}</p>
                <span className="mt-2 inline-block rounded-full border border-white/[0.08] px-3 py-0.5 text-[10px] tracking-wider text-muted/70">
                  {p.scope}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十天干 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title="十天干 · 天之气" sub="点击天干，感悟其能量之性" />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {TIANGAN.map((t, i) => (
            <Reveal key={t.char} delay={(i % 5) * 70}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span
                  className="font-display text-2xl leading-none transition-transform duration-300 group-hover:scale-110"
                  style={{ color: ELEMENT_DOT[t.element], filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {t.char}
                </span>
                <span className="mt-1.5 text-[9px] tracking-[0.15em] text-muted/80 uppercase">
                  {t.pinyin}
                </span>
                <span
                  className="mt-1 text-[10px]"
                  style={{ color: ELEMENT_DOT[t.element] }}
                >
                  {t.yinyang}{t.element}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二地支 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title="十二地支 · 地之形" sub="生肖 · 时辰 · 点击地支感受其灵" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {DIZHI.map((d, i) => (
            <Reveal key={d.char} delay={(i % 6) * 60}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span className="text-xl">{d.animal}</span>
                <span
                  className="mt-1.5 font-display text-base leading-none"
                  style={{ color: ELEMENT_DOT[d.element], filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {d.char}
                </span>
                <span className="mt-1 text-[10px] text-muted/80">{d.time}</span>
                <span
                  className="mt-0.5 text-[9px]"
                  style={{ color: ELEMENT_DOT[d.element] }}
                >
                  {d.element}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 五行生克 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="04" title="五行生克 · 平衡之道" sub="命理之要，在于五行之平衡流通" />
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 相生 */}
          <Reveal>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="mb-4 font-display text-sm tracking-[0.25em] text-accent/90 uppercase">
                相生 · 循环滋养
              </h3>
              <div className="space-y-2.5">
                {WUXING_SHENG.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: ELEMENT_DOT[r.from] }}>{r.from}</span>
                    <span className="text-muted/70">→</span>
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: ELEMENT_DOT[r.to] }}>{r.to}</span>
                    <span className="text-xs text-muted">{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          {/* 相克 */}
          <Reveal delay={120}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="mb-4 font-display text-sm tracking-[0.25em] text-muted/90 uppercase">
                相克 · 循环制约
              </h3>
              <div className="space-y-2.5">
                {WUXING_KE.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: ELEMENT_DOT[r.from] }}>{r.from}</span>
                    <span className="text-muted/70">×</span>
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: ELEMENT_DOT[r.to] }}>{r.to}</span>
                    <span className="text-xs text-muted">{r.reason}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-muted/90">
                过旺者宜泄宜克，过弱者宜生宜扶。五行失衡之处，即是人生功课所在。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 十神 */}
      <section className="mb-8">
        <SectionHead no="05" title="十神 · 万象之影" sub="以日主为中心，其余七字皆化为十种人生角色" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {SHISHEN.map((s, i) => (
            <Reveal key={s.name} delay={(i % 5) * 70}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span className="font-display text-sm tracking-[0.1em] text-frost">{s.name}</span>
                  <span className={`ml-auto text-[9px] ${s.type === '吉' ? 'text-[#7dba6e]' : s.type === '警示' ? 'text-[#d4766e]' : 'text-muted/60'}`}>
                    {s.type}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted">{s.desc}</p>
                <p className="mt-1 text-[12px] text-frost/75">{s.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
