'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { TAROT_DECK, getCardImage } from '@/lib/tarot';

interface Article {
  id: number;
  slug: string;
  sort_order: number;
  title_zh: string;
  title_en: string;
  title_ja: string;
  summary_zh: string;
  summary_en: string;
  summary_ja: string;
}

/** slug=myth-XX，XX 即大阿卡纳 id（0~21） */
const cardIdOf = (slug: string) => {
  const m = slug.match(/^myth-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
};

export default function MythListPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) { setLoading(false); return; }
    sb.from('learn_articles')
      .select('id, slug, sort_order, title_zh, title_en, title_ja, summary_zh, summary_en, summary_ja')
      .eq('category', 'myth')
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
      label={t('learn.myth.label')}
      title={t('learn.myth.title')}
      subtitle={t('learn.myth.subtitle')}
      wide
    >
      <section className="mt-12">
        {loading && (
          <p className="py-16 text-center text-sm text-muted/60">{t('learn.practice.loading')}</p>
        )}
        {!loading && articles.length === 0 && (
          <p className="py-16 text-center text-sm text-muted/60">{t('learn.practice.writing')}</p>
        )}
        {!loading && articles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => {
              const cardId = cardIdOf(a.slug);
              const card = cardId !== null ? TAROT_DECK.find((c) => c.id === cardId) : null;
              return (
                <Reveal key={a.slug} delay={(i % 3) * 70}>
                  <button
                    onClick={() => router.push(`/learn/myth/${a.slug}`)}
                    className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-accent/30 hover:bg-accent/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-display mt-1 text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                        🏛️ {card?.numeral || String(a.sort_order).padStart(2, '0')}
                      </span>
                      {card && (
                        <div
                          className="w-10 shrink-0 overflow-hidden rounded-md shadow-md shadow-black/30 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105"
                          style={{ aspectRatio: '2 / 3.4' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getCardImage(card.id)} alt={a.title_zh} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-display mt-3 text-base tracking-[0.1em] text-frost">{titleOf(a)}</h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">{summaryOf(a)}</p>
                  </button>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
