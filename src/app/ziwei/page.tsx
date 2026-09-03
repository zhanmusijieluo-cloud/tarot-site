'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useI18n } from '@/i18n';

// 主星名（紫微/天机…）为文化专名保留原文；描述走 i18n（ziwei.star.N.*）
const MAIN_STARS = [
  { name: '紫微', pinyin: 'Ziwei' },
  { name: '天机', pinyin: 'Tianji' },
  { name: '太阳', pinyin: 'Taiyang' },
  { name: '武曲', pinyin: 'Wuqu' },
  { name: '天同', pinyin: 'Tiantong' },
  { name: '廉贞', pinyin: 'Lianzhen' },
  { name: '天府', pinyin: 'Tianfu' },
  { name: '太阴', pinyin: 'Taiyin' },
  { name: '贪狼', pinyin: 'Tanlang' },
  { name: '巨门', pinyin: 'Jumen' },
  { name: '天相', pinyin: 'Tianxiang' },
  { name: '天梁', pinyin: 'Tianliang' },
  { name: '七杀', pinyin: 'Qisha' },
  { name: '破军', pinyin: 'Pojun' },
];

const STAR_SYMBOLS = ['✶', '✦', '☀', '⚔', '☾', '❤', '♛', '☽', '◆', '◈', '✚', '✳', '✠', '✸'];

const GONGWEI = [
  { key: 'ming', symbol: '命' },
  { key: 'xiong', symbol: '兄' },
  { key: 'fu', symbol: '夫' },
  { key: 'zi', symbol: '子' },
  { key: 'cai', symbol: '财' },
  { key: 'ji', symbol: '疾' },
  { key: 'qian', symbol: '迁' },
  { key: 'you', symbol: '友' },
  { key: 'guan', symbol: '官' },
  { key: 'zhai', symbol: '宅' },
  { key: 'fude', symbol: '福' },
  { key: 'fumu', symbol: '父' },
];

const SIHUA = [
  { icon: '禄', i: 0 },
  { icon: '权', i: 1 },
  { icon: '科', i: 2 },
  { icon: '忌', i: 3 },
];

const JUGE_ICONS = ['✦', '✦', '✦', '✦', '✦', '✦'];

export default function ZiweiPage() {
  const { t } = useI18n();
  return (
    <PageShell
      label={t('page.ziwei.label')}
      title={t('page.ziwei.title')}
      subtitle={t('page.ziwei.subtitle')}
      footer={
        <p className="text-[11px] leading-relaxed text-muted/90">
          {t('page.ziwei.footer')}
        </p>
      }
    >
      {/* 十四主星 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title={t('ziwei.starSection')} sub={t('ziwei.starSub')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {MAIN_STARS.map((s, i) => (
            <Reveal key={s.name} delay={(i % 7) * 60}>
              <div className="group h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05]">
                <span
                  className="block text-xl leading-none transition-transform duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(200,216,255,0.4))' }}
                >
                  {STAR_SYMBOLS[i]}
                </span>
                <span className="font-display mt-2 block text-xs tracking-[0.1em] text-frost">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.2em] text-muted/60 uppercase">
                  {s.pinyin}
                </span>
                <p className="mt-2 text-[11px] leading-snug text-muted">{t(`ziwei.star.${i}.role`)}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted/70">{t(`ziwei.star.${i}.trait`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二宫位 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title={t('ziwei.palaceSection')} sub={t('ziwei.palaceSub')} />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {GONGWEI.map((g, i) => (
            <Reveal key={g.key} delay={(i % 4) * 70}>
              <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-accent/25">
                <span className="font-display w-7 shrink-0 text-lg font-extralight text-accent/60">
                  {g.symbol}
                </span>
                <div>
                  <span className="font-display text-sm tracking-[0.12em] text-frost">{t(`ziwei.palace.${i}.name`)}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{t(`ziwei.palace.${i}.desc`)}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 四化 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title={t('ziwei.huaSection')} sub={t('ziwei.huaSub')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIHUA.map((s, i) => (
            <Reveal key={s.icon} delay={i * 80}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-accent/30">
                <span className="font-display text-2xl text-accent/80">{s.icon}</span>
                <h3 className="font-display mt-3 text-base tracking-[0.15em] text-frost">
                  {['化禄', '化权', '化科', '化忌'][i]}
                </h3>
                <p className="mt-1 text-[12px] text-muted">{t(`ziwei.hua.${i}.nature`)}</p>
                <div className="hairline-glow my-4 w-10" />
                <p className="text-[12px] leading-relaxed text-muted/90">{t(`ziwei.hua.${i}.guide`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 经典格局 */}
      <section className="mb-8">
        <SectionHead no="04" title={t('ziwei.patternSection')} sub={t('ziwei.patternSub')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JUGE_ICONS.map((icon, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:border-accent/25">
                <div className="flex items-center gap-2">
                  <span className="text-accent/70">{icon}</span>
                  <span className="font-display text-sm tracking-[0.12em] text-frost">{t(`ziwei.juge.${i}.name`)}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{t(`ziwei.juge.${i}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
