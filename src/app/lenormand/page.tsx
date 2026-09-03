'use client';

import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

// 36 张雷诺曼牌：图标 + 编号为通用符号；名称与关键词走 i18n（ln.N.name / ln.N.kw）
const CARDS = [
  '🐎', '🍀', '⛵', '🏠', '🌳', '☁️', '🐍', '⚰️', '💐', '🌾',
  '🪢', '🕊️', '🧒', '🦊', '🐻', '⭐', '🦩', '🐕', '🗼', '🌳',
  '⛰️', '🛤️', '🐁', '💗', '💍', '📖', '✉️', '🤵', '👗', '🌺',
  '☀️', '🌙', '🗝️', '🐟', '⚓', '✝️',
];

export default function LenormandPage() {
  const router = useRouter();
  const { t, lang } = useI18n();

  // 关键词分隔符：中文用「 · 」拼前两个，en/ja 原样展示
  const kwPreview = (kw: string) => {
    if (lang === 'zh') {
      const parts = kw.split(' · ');
      return parts.slice(0, 2).join(' · ');
    }
    return kw;
  };

  return (
    <PageShell
      label={t('page.lenormand.label')}
      title={t('page.lenormand.title')}
      subtitle={t('page.lenormand.subtitle')}
      wide
      footer={
        <button
          onClick={() => router.push('/online')}
          className="glass-btn-primary text-xs tracking-[0.25em]"
        >
          {t('closing.cta')} →
        </button>
      }
    >
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead
          no="01"
          title={t('lenormand.cardSection')}
          sub={t('lenormand.cardSub')}
        />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
          {CARDS.map((icon, i) => (
            <Reveal key={i} delay={(i % 9) * 55}>
              <div className="group flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.05] hover:-translate-y-1">
                <span className="text-base">{icon}</span>
                <span className="mt-1.5 font-display text-xs tracking-[0.1em] text-frost">
                  {t(`ln.${i}.name`)}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.2em] text-muted/60 uppercase">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-2 block text-[10px] leading-snug text-muted/80">
                  {kwPreview(t(`ln.${i}.kw`))}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHead no="02" title={t('lenormand.methodSection')} sub={t('lenormand.methodSub')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { titleKey: 'lenormand.method1', descKey: 'lenormand.method1Desc' },
            { titleKey: 'lenormand.method2', descKey: 'lenormand.method2Desc' },
            { titleKey: 'lenormand.method3', descKey: 'lenormand.method3Desc' },
          ].map((m, i) => (
            <Reveal key={m.titleKey} delay={i * 100}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="font-display text-sm tracking-[0.15em] text-frost">{t(m.titleKey)}</h3>
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{t(m.descKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
