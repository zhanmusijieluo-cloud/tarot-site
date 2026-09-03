'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CalendarDays, LayoutGrid, Sparkles } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import { useI18n } from '@/i18n';

const ENTRIES = [
  {
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
    titleKey: 'tarot.entries.online',
    en: 'Online Reading',
    descKey: 'tarot.entries.onlineDesc',
    route: '/online',
  },
  {
    icon: <LayoutGrid className="h-5 w-5" aria-hidden="true" />,
    titleKey: 'tarot.entries.spreads',
    en: 'Spreads',
    descKey: 'tarot.entries.spreadsDesc',
    route: '/spreads',
  },
  {
    icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
    titleKey: 'tarot.entries.learn',
    en: 'Learn',
    descKey: 'tarot.entries.learnDesc',
    route: '/learn',
  },
  {
    icon: <CalendarDays className="h-5 w-5" aria-hidden="true" />,
    titleKey: 'tarot.entries.daily',
    en: 'Daily',
    descKey: 'tarot.entries.dailyDesc',
    route: '/online?spread=daily',
  },
];

export default function ReadingPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <PageShell
      label={t('page.reading.label')}
      title={t('page.reading.title')}
      subtitle={t('page.reading.subtitle')}
      footer={
        <p className="text-sm leading-relaxed text-muted/90">
          「{t('page.learn.footer').replace(/[「」]/g, '')}」
        </p>
      }
    >
      {/* 桌面：2 列大卡片；移动：1 列（四窗口等宽对齐） */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {ENTRIES.map((e, i) => (
          <Reveal key={e.titleKey} delay={i * 90}>
            <button
              onClick={() => router.push(e.route)}
              className="group flex w-full items-center gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-left transition-all duration-300 hover:border-accent/30 hover:bg-white/[0.04] lg:p-10"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-105">
                {e.icon}
              </span>
              <div className="flex-1">
                <p className="text-[11px] tracking-[0.25em] text-muted/70 uppercase">{e.en}</p>
                <h3 className="font-display mt-1.5 text-xl tracking-[0.08em] text-frost lg:text-2xl">
                  {t(e.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-muted lg:text-base">{t(e.descKey)}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-all group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true" />
            </button>
          </Reveal>
        ))}
      </div>
    </PageShell>
  );
}