'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useI18n } from '@/i18n';

const PILLARS = [
  { key: 'year', en: 'Year' },
  { key: 'month', en: 'Month' },
  { key: 'day', en: 'Day' },
  { key: 'hour', en: 'Hour' },
];

// 天干地支汉字为文化专名，保留原文；描述性文字走 i18n（bazi.tg.N.* / bazi.dz.N.*）
const TIANGAN = [
  { char: '甲', pinyin: 'Jiǎ', elementKey: 'bazi.wx.wood', i: 0 },
  { char: '乙', pinyin: 'Yǐ', elementKey: 'bazi.wx.wood', i: 1 },
  { char: '丙', pinyin: 'Bǐng', elementKey: 'bazi.wx.fire', i: 2 },
  { char: '丁', pinyin: 'Dīng', elementKey: 'bazi.wx.fire', i: 3 },
  { char: '戊', pinyin: 'Wù', elementKey: 'bazi.wx.earth', i: 4 },
  { char: '己', pinyin: 'Jǐ', elementKey: 'bazi.wx.earth', i: 5 },
  { char: '庚', pinyin: 'Gēng', elementKey: 'bazi.wx.metal', i: 6 },
  { char: '辛', pinyin: 'Xīn', elementKey: 'bazi.wx.metal', i: 7 },
  { char: '壬', pinyin: 'Rén', elementKey: 'bazi.wx.water', i: 8 },
  { char: '癸', pinyin: 'Guǐ', elementKey: 'bazi.wx.water', i: 9 },
];

// 五行元素色
const ELEMENT_COLOR: Record<string, string> = {
  wood: '#7dba6e',
  fire: '#d4766e',
  earth: '#cdb88a',
  metal: '#d0c8b0',
  water: '#7ca8d4',
};

const DIZHI = [
  { char: '子', i: 0, el: 'water', time: '23-1' },
  { char: '丑', i: 1, el: 'earth', time: '1-3' },
  { char: '寅', i: 2, el: 'wood', time: '3-5' },
  { char: '卯', i: 3, el: 'wood', time: '5-7' },
  { char: '辰', i: 4, el: 'earth', time: '7-9' },
  { char: '巳', i: 5, el: 'fire', time: '9-11' },
  { char: '午', i: 6, el: 'fire', time: '11-13' },
  { char: '未', i: 7, el: 'earth', time: '13-15' },
  { char: '申', i: 8, el: 'metal', time: '15-17' },
  { char: '酉', i: 9, el: 'metal', time: '17-19' },
  { char: '戌', i: 10, el: 'earth', time: '19-21' },
  { char: '亥', i: 11, el: 'water', time: '21-23' },
];

const WUXING_SHENG = [
  { from: '木', to: '火', fromC: '#7dba6e', toC: '#d4766e', i: 0 },
  { from: '火', to: '土', fromC: '#d4766e', toC: '#cdb88a', i: 1 },
  { from: '土', to: '金', fromC: '#cdb88a', toC: '#d0c8b0', i: 2 },
  { from: '金', to: '水', fromC: '#d0c8b0', toC: '#7ca8d4', i: 3 },
  { from: '水', to: '木', fromC: '#7ca8d4', toC: '#7dba6e', i: 4 },
];

const WUXING_KE = [
  { from: '木', to: '土', fromC: '#7dba6e', toC: '#cdb88a', i: 0 },
  { from: '土', to: '水', fromC: '#cdb88a', toC: '#7ca8d4', i: 1 },
  { from: '水', to: '火', fromC: '#7ca8d4', toC: '#d4766e', i: 2 },
  { from: '火', to: '金', fromC: '#d4766e', toC: '#d0c8b0', i: 3 },
  { from: '金', to: '木', fromC: '#d0c8b0', toC: '#7dba6e', i: 4 },
];

const SHISHEN = [
  { icon: '✦', i: 0 }, { icon: '◆', i: 1 }, { icon: '✦', i: 2 }, { icon: '◆', i: 3 },
  { icon: '✦', i: 4 }, { icon: '◆', i: 5 }, { icon: '✦', i: 6 }, { icon: '◆', i: 7 },
  { icon: '✦', i: 8 }, { icon: '◆', i: 9 },
];

export default function BaziPage() {
  const { t } = useI18n();
  return (
    <PageShell
      label={t('page.bazi.label')}
      title={t('page.bazi.title')}
      subtitle={t('page.bazi.subtitle')}
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          {t('page.bazi.footer')}
        </p>
      }
    >
      {/* 四柱 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title={t('bazi.pillarSection')} sub={t('bazi.pillarSub')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, idx) => (
            <Reveal key={p.key} delay={idx * 90}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center transition-all duration-300 hover:border-accent/25">
                <span className="font-display text-[10px] tracking-[0.3em] text-accent/60 uppercase">
                  {p.en}
                </span>
                <span className="mt-2 block font-display text-lg tracking-[0.15em] text-frost">
                  {t(`bazi.pillar.${p.key}.name`)}
                </span>
                <div className="hairline-glow mx-auto my-3 w-10" />
                <p className="text-[12px] text-muted">{t(`bazi.pillar.${p.key}.subject`)}</p>
                <span className="mt-2 inline-block rounded-full border border-white/[0.08] px-3 py-0.5 text-[10px] tracking-wider text-muted/70">
                  {t(`bazi.pillar.${p.key}.scope`)}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十天干 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title={t('bazi.tianGanSection')} sub={t('bazi.tianGanSub')} />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {TIANGAN.map((g, idx) => (
            <Reveal key={g.char} delay={(idx % 5) * 70}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span
                  className="font-display text-2xl leading-none transition-transform duration-300 group-hover:scale-110"
                  style={{ color: ELEMENT_COLOR[g.elementKey.replace('bazi.wx.', '')], filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {g.char}
                </span>
                <span className="mt-1.5 text-[9px] tracking-[0.15em] text-muted/80 uppercase">
                  {g.pinyin}
                </span>
                <span
                  className="mt-1 text-[10px]"
                  style={{ color: ELEMENT_COLOR[g.elementKey.replace('bazi.wx.', '')] }}
                >
                  {t(`bazi.tg.${g.i}.yinyang`)}{t(g.elementKey)}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二地支 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title={t('bazi.diZhiSection')} sub={t('bazi.diZhiSub')} />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {DIZHI.map((d, idx) => (
            <Reveal key={d.char} delay={(idx % 6) * 60}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span className="text-xl">{t(`bazi.dz.${d.i}.animal`)}</span>
                <span
                  className="mt-1.5 font-display text-base leading-none"
                  style={{ color: ELEMENT_COLOR[d.el], filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {d.char}
                </span>
                <span className="mt-1 text-[10px] text-muted/80">{d.time}</span>
                <span
                  className="mt-0.5 text-[9px]"
                  style={{ color: ELEMENT_COLOR[d.el] }}
                >
                  {t(`bazi.wx.${d.el}`)}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 五行生克 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="04" title={t('bazi.wuxingSection')} sub={t('bazi.wuxingSub')} />
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 相生 */}
          <Reveal>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="mb-4 font-display text-sm tracking-[0.25em] text-accent/90 uppercase">
                {t('bazi.wuxingSheng')}
              </h3>
              <div className="space-y-2.5">
                {WUXING_SHENG.map((r) => (
                  <div key={r.i} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: r.fromC }}>{r.from}</span>
                    <span className="text-muted/70">→</span>
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: r.toC }}>{r.to}</span>
                    <span className="text-xs text-muted">{t(`bazi.sheng.${r.i}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          {/* 相克 */}
          <Reveal delay={120}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="mb-4 font-display text-sm tracking-[0.25em] text-muted/90 uppercase">
                {t('bazi.wuxingKe')}
              </h3>
              <div className="space-y-2.5">
                {WUXING_KE.map((r) => (
                  <div key={r.i} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: r.fromC }}>{r.from}</span>
                    <span className="text-muted/70">×</span>
                    <span className="w-8 shrink-0 text-sm font-display" style={{ color: r.toC }}>{r.to}</span>
                    <span className="text-xs text-muted">{t(`bazi.ke.${r.i}`)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-muted/90">
                {t('bazi.wuxingTip')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 十神 */}
      <section className="mb-8">
        <SectionHead no="05" title={t('bazi.shishenSection')} sub={t('bazi.shishenSub')} />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {SHISHEN.map((s, idx) => {
            const type = t(`bazi.ss.${s.i}.type`);
            return (
              <Reveal key={s.i} delay={(idx % 5) * 70}>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span className="font-display text-sm tracking-[0.1em] text-frost">{t(`bazi.ss.${s.i}.name`)}</span>
                    <span className={`ml-auto text-[9px] ${type === '吉' || type === 'Auspicious' ? 'text-[#7dba6e]' : type === '警示' || type === 'Cautionary' ? 'text-[#d4766e]' : 'text-muted/60'}`}>
                      {type}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">{t(`bazi.ss.${s.i}.desc`)}</p>
                  <p className="mt-1 text-[12px] text-frost/75">{t(`bazi.ss.${s.i}.role`)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
