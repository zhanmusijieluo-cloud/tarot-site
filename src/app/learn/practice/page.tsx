'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

interface Article {
  id: number;
  slug: string;
  category: string;
  sort_order: number;
  title_zh: string;
  title_en: string;
  title_ja: string;
  summary_zh: string;
  summary_en: string;
  summary_ja: string;
  content_zh: string;
}

const CATEGORY_ORDER = ['foundation', 'advanced', 'practice'] as const;
const CATEGORY_ICON: Record<string, string> = { foundation: '🌱', advanced: '🔮', practice: '⚔️' };

export default function PracticeListPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) { setLoading(false); return; }
    sb.from('learn_articles')
      .select('id, slug, category, sort_order, title_zh, title_en, title_ja, summary_zh, summary_en, summary_ja, content_zh')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setArticles(data as Article[]);
        setLoading(false);
      });
  }, []);

  const titleOf = (a: Article) => (lang === 'en' ? a.title_en || a.title_zh : lang === 'ja' ? a.title_ja || a.title_zh : a.title_zh);
  const summaryOf = (a: Article) => (lang === 'en' ? a.summary_en || a.summary_zh : lang === 'ja' ? a.summary_ja || a.summary_zh : a.summary_zh);

  return (
    <PageShell
      label={t('learn.practice.label')}
      title={t('learn.practice.title')}
      subtitle={t('learn.practice.subtitle')}
      wide
    >
      <section className="mt-12 space-y-16">
        {loading && (
          <p className="py-16 text-center text-sm text-muted/60">{t('learn.practice.loading')}</p>
        )}
        {!loading && CATEGORY_ORDER.map((cat) => {
          const items = articles.filter((a) => a.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <SectionHead no={`0${CATEGORY_ORDER.indexOf(cat) + 1}`} title={t(`learn.practice.cat.${cat}`)} sub={t(`learn.practice.catSub.${cat}`)} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a, i) => {
                  const ready = !!a.content_zh;
                  return (
                    <Reveal key={a.slug} delay={(i % 3) * 70}>
                      <button
                        onClick={() => router.push(`/learn/practice/${a.slug}`)}
                        className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.04]"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                            {CATEGORY_ICON[cat]} {String(a.sort_order).padStart(2, '0')}
                          </span>
                          {!ready && <span className="text-[10px] tracking-[0.15em] text-muted/50">{t('learn.comingSoon')}</span>}
                        </div>
                        <h3 className="font-display mt-3 text-base tracking-[0.1em] text-frost">{titleOf(a)}</h3>
                        <p className="mt-2 text-[12px] leading-relaxed text-muted">{summaryOf(a)}</p>
                      </button>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </PageShell>
  );
}
