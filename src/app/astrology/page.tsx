'use client';

import { useState } from 'react';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';

const SIGNS = [
  { symbol: '♈', name: '白羊座', en: 'Aries', date: '3.21 - 4.19', element: '火', traits: '勇气 · 开拓' },
  { symbol: '♉', name: '金牛座', en: 'Taurus', date: '4.20 - 5.20', element: '土', traits: '稳固 · 丰盛' },
  { symbol: '♊', name: '双子座', en: 'Gemini', date: '5.21 - 6.21', element: '风', traits: '沟通 · 多变' },
  { symbol: '♋', name: '巨蟹座', en: 'Cancer', date: '6.22 - 7.22', element: '水', traits: '情感 · 守护' },
  { symbol: '♌', name: '狮子座', en: 'Leo', date: '7.23 - 8.22', element: '火', traits: '光芒 · 自信' },
  { symbol: '♍', name: '处女座', en: 'Virgo', date: '8.23 - 9.22', element: '土', traits: '细致 · 完美' },
  { symbol: '♎', name: '天秤座', en: 'Libra', date: '9.23 - 10.23', element: '风', traits: '平衡 · 优雅' },
  { symbol: '♏', name: '天蝎座', en: 'Scorpio', date: '10.24 - 11.22', element: '水', traits: '深沉 · 蜕变' },
  { symbol: '♐', name: '射手座', en: 'Sagittarius', date: '11.23 - 12.21', element: '火', traits: '自由 · 远方' },
  { symbol: '♑', name: '摩羯座', en: 'Capricorn', date: '12.22 - 1.19', element: '土', traits: '坚韧 · 攀登' },
  { symbol: '♒', name: '水瓶座', en: 'Aquarius', date: '1.20 - 2.18', element: '风', traits: '革新 · 独立' },
  { symbol: '♓', name: '双鱼座', en: 'Pisces', date: '2.19 - 3.20', element: '水', traits: '梦幻 · 慈悲' },
];

const PLANETS = [
  { symbol: '☉', name: '太阳', en: 'Sun', role: '核心自我 · 生命力' },
  { symbol: '☽', name: '月亮', en: 'Moon', role: '情绪 · 潜意识' },
  { symbol: '☿', name: '水星', en: 'Mercury', role: '思维 · 沟通' },
  { symbol: '♀', name: '金星', en: 'Venus', role: '爱 · 美 · 价值' },
  { symbol: '♂', name: '火星', en: 'Mars', role: '行动 · 欲望' },
  { symbol: '♃', name: '木星', en: 'Jupiter', role: '扩张 · 幸运' },
  { symbol: '♄', name: '土星', en: 'Saturn', role: '纪律 · 责任' },
  { symbol: '♅', name: '天王星', en: 'Uranus', role: '变革 · 觉醒' },
  { symbol: '♆', name: '海王星', en: 'Neptune', role: '梦想 · 灵性' },
  { symbol: '♇', name: '冥王星', en: 'Pluto', role: '转化 · 重生' },
];

const HOUSES = [
  { no: 1, name: '命宫', domain: '自我 · 形象 · 生命开端' },
  { no: 2, name: '财帛宫', domain: '金钱 · 价值 · 资源' },
  { no: 3, name: '兄弟宫', domain: '沟通 · 学习 · 近途' },
  { no: 4, name: '田宅宫', domain: '家庭 · 根基 · 内心归属' },
  { no: 5, name: '子女宫', domain: '创造 · 恋爱 · 娱乐' },
  { no: 6, name: '疾厄宫', domain: '健康 · 日常 · 服务' },
  { no: 7, name: '夫妻宫', domain: '伴侣 · 合作 · 契约' },
  { no: 8, name: '疾厄深层', domain: '转化 · 共有 · 深层心理' },
  { no: 9, name: '迁移宫', domain: '远行 · 哲学 · 高等学习' },
  { no: 10, name: '官禄宫', domain: '事业 · 声望 · 人生方向' },
  { no: 11, name: '交友宫', domain: '社群 · 愿景 · 未来' },
  { no: 12, name: '玄秘宫', domain: '潜意识 · 灵性 · 隐匿' },
];

const ASPECTS = [
  { symbol: '☌', name: '合相', angle: '0°', meaning: '能量融合 · 强化' },
  { symbol: '⚹', name: '六合', angle: '60°', meaning: '和谐 · 机会 · 天赋' },
  { symbol: '□', name: '刑克', angle: '90°', meaning: '张力 · 挑战 · 成长' },
  { symbol: '△', name: '三合', angle: '120°', meaning: '顺畅 · 轻松 · 恩赐' },
  { symbol: '☍', name: '对冲', angle: '180°', meaning: '平衡 · 对照 · 觉察' },
];

const ELEMENT_COLOR: Record<string, string> = {
  '火': 'text-[#e8a08a]',
  '土': 'text-[#cdb88a]',
  '风': 'text-[#9cc3d8]',
  '水': 'text-[#8aa8d8]',
};

export default function AstrologyPage() {
  const [activeSign, setActiveSign] = useState<number | null>(null);
  const sign = activeSign !== null ? SIGNS[activeSign] : null;

  return (
    <PageShell
      label="Astrology · Dome"
      title="星盘之穹"
      subtitle="十二星座 · 十大行星 · 十二宫位 · 五大相位"
      wide
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          行星之间的角度，即是灵魂内在的对话
        </p>
      }
    >
      {/* 十二星座 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title="十二星座 · 黄道之环" sub="点击星座，窥见其能量真义" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {SIGNS.map((s, i) => (
            <Reveal key={s.name} delay={(i % 6) * 60}>
              <button
                onClick={() => setActiveSign(i)}
                className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-accent/[0.05]"
              >
                <span
                  className="block text-2xl transition-all duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(200,216,255,0.35))' }}
                >
                  {s.symbol}
                </span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.1em] text-frost">
                  {s.name}
                </span>
                <span className="mt-1 block text-[10px] tracking-wide text-muted/80">{s.date}</span>
                <span className={`mt-1.5 block text-[11px] ${ELEMENT_COLOR[s.element]}`}>
                  {s.element}象 · {s.traits}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十大行星 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title="十大行星 · 灵魂角色" sub="每颗行星都是你灵魂剧本中的一个角色" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLANETS.map((p, i) => (
            <Reveal key={p.name} delay={(i % 5) * 70}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/25">
                <span className="block text-2xl text-metal/90">{p.symbol}</span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.12em] text-frost">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.25em] text-muted/60 uppercase">
                  {p.en}
                </span>
                <span className="mt-2 block text-[11px] leading-snug text-muted">{p.role}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二宫位 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title="十二宫位 · 人生领域" sub="命宫为始，十二宫覆盖人生的全部维度" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {HOUSES.map((h, i) => (
            <Reveal key={h.no} delay={(i % 3) * 70}>
              <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-accent/25">
                <span className="font-display w-7 shrink-0 text-lg font-extralight text-accent/60">
                  {h.no}
                </span>
                <div>
                  <span className="font-display text-sm tracking-[0.15em] text-frost">{h.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{h.domain}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 五大相位 */}
      <section className="mb-8">
        <SectionHead no="04" title="五大相位 · 能量之舞" sub="行星之间的角度，即是灵魂内在的对话" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {ASPECTS.map((a, i) => (
            <Reveal key={a.name} delay={i * 70}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center transition-all duration-300 hover:border-accent/25">
                <span className="block text-2xl text-metal/90">{a.symbol}</span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.15em] text-frost">
                  {a.name}
                </span>
                <span className="mt-0.5 block text-[11px] tracking-[0.2em] text-accent/70">
                  {a.angle}
                </span>
                <span className="mt-2 block text-[11px] leading-snug text-muted">{a.meaning}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 星座详情浮层 */}
      {sign && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
          onClick={() => setActiveSign(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="glass-panel relative w-full max-w-xs rounded-3xl p-7 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'rise-in 0.5s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <span
              className="block text-4xl"
              style={{ filter: 'drop-shadow(0 0 12px rgba(200,216,255,0.5))' }}
            >
              {sign.symbol}
            </span>
            <h3 className="font-display mt-3 text-xl tracking-[0.2em] text-frost">{sign.name}</h3>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-muted/70 uppercase">{sign.en}</p>
            <div className="hairline-glow mx-auto my-5 w-20" />
            <div className="space-y-2.5 text-[13px]">
              <p className="text-muted">
                日期 · <span className="text-frost/85">{sign.date}</span>
              </p>
              <p className="text-muted">
                元素 · <span className={`${ELEMENT_COLOR[sign.element]}`}>{sign.element}象</span>
              </p>
              <p className="text-muted">
                特质 · <span className="text-frost/85">{sign.traits}</span>
              </p>
            </div>
            <button
              onClick={() => setActiveSign(null)}
              className="glass-btn mt-6 w-full text-xs tracking-[0.2em]"
            >
              收起
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
