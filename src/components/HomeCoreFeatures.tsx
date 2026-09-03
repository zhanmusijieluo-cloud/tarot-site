'use client';

import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

const ENTRIES = [
  {
    key: 'tarot',
    en: 'Tarot',
    historyKey: 'core.tarot.history',
    presentKey: 'core.tarot.present',
    route: '/reading',
  },
  {
    key: 'astrology',
    en: 'Astrology',
    historyKey: 'core.astrology.history',
    presentKey: 'core.astrology.present',
    route: '/astrology',
  },
  {
    key: 'lenormand',
    en: 'Lenormand',
    historyKey: 'core.lenormand.history',
    presentKey: 'core.lenormand.present',
    route: '/lenormand',
  },
  {
    key: 'bazi',
    en: 'BaZi',
    historyKey: 'core.bazi.history',
    presentKey: 'core.bazi.present',
    route: '/bazi',
  },
  {
    key: 'ziwei',
    en: 'Zi Wei Dou Shu',
    historyKey: 'core.ziwei.history',
    presentKey: 'core.ziwei.present',
    route: '/ziwei',
  },
];

export default function HomeCoreFeatures() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <section id="core-features" className="relative w-full px-6 pt-24 pb-20 sm:px-8 sm:pt-32 sm:pb-24">
      {/* 顶部衔接层：承接 Hero 底部渐隐，星星亮度从暗到亮平滑过渡 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-void via-[rgba(8,7,9,0.7)] to-transparent"
        aria-hidden="true"
      />

      {/* 标题区 */}
      <div className="relative z-10 mx-auto mb-14 w-full max-w-[90rem] text-center sm:mb-16">
        <p className="text-[0.7rem] tracking-[0.45em] text-accent/70 uppercase sm:text-xs">{t('core.en')}</p>
        <h2 className="font-display mt-6 text-[clamp(2rem,4vw,3.5rem)] font-light tracking-[0.1em] text-frost">
          {t('core.title')}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted">
          {t('core.desc')}
        </p>
        <div className="hairline-glow mx-auto mt-10 w-24" />
      </div>

      {/* 卡片：桌面端两列，第五张居中半宽 */}
      <div className="relative z-10 mx-auto grid w-full max-w-[90rem] gap-6 lg:grid-cols-2 lg:gap-8">
        {ENTRIES.map((entry, index) => (
          <button
            key={entry.key}
            onClick={() => router.push(entry.route)}
            className={`frosted-card group flex w-full flex-col p-8 text-left sm:p-9 ${
              index === ENTRIES.length - 1 ? 'lg:col-span-2 lg:mx-auto lg:w-[calc(50%-1rem)]' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <h3 className="font-display text-3xl font-light tracking-[0.1em] text-frost">{t(`core.${entry.key}.title`)}</h3>
                <span className="text-[0.7rem] tracking-[0.28em] text-accent/60 uppercase">{entry.en}</span>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>

            <div className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-6">
              <p className="text-sm leading-7 text-muted">
                <span className="mr-2 text-[0.65rem] tracking-[0.2em] text-accent/70 uppercase">{t('core.history')}</span>
                {t(entry.historyKey)}
              </p>
              <p className="text-sm leading-7 text-muted">
                <span className="mr-2 text-[0.65rem] tracking-[0.2em] text-accent/70 uppercase">{t('core.present')}</span>
                {t(entry.presentKey)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
