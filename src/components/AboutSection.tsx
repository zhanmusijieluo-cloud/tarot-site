'use client';

import { useI18n } from '@/i18n';

const FEATURES = [
  {
    icon: '✦',
    titleKey: 'about.feature1',
    descKey: 'about.feature1Desc',
  },
  {
    icon: '♄',
    titleKey: 'about.feature2',
    descKey: 'about.feature2Desc',
  },
  {
    icon: '◇',
    titleKey: 'about.feature3',
    descKey: 'about.feature3Desc',
  },
  {
    icon: '☾',
    titleKey: 'about.feature4',
    descKey: 'about.feature4Desc',
  },
];

export default function AboutSection() {
  const { t } = useI18n();
  return (
    <section id="about" className="relative mx-auto max-w-[90rem] px-8 py-16 sm:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-2">
        {/* 左：介绍 */}
        <div>
          <p className="mt-10 text-lg leading-relaxed text-muted">
            {t('about.intro1')}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            {t('about.intro2')}
          </p>

          <div className="mt-12 rounded-2xl border border-accent/15 bg-accent/[0.04] p-10">
            <p className="font-display text-base tracking-[0.15em] text-accent-soft">{t('about.aiNote')}</p>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {t('about.aiNoteDesc')}
            </p>
          </div>
        </div>

        {/* 右：特色卡片 */}
        <div className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="liquid-glass rounded-2xl p-10">
              <span className="text-3xl text-accent" aria-hidden="true">{f.icon}</span>
              <h3 className="font-display mt-6 text-xl tracking-[0.1em] text-frost">{t(f.titleKey)}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
