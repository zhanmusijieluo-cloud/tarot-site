'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';
import { supabaseBrowser } from '@/lib/supabase';
import { useI18n } from '@/i18n';

interface Article {
  id: number;
  slug: string;
  category: string;
  title_zh: string;
  title_en: string;
  title_ja: string;
  summary_zh: string;
  summary_en: string;
  summary_ja: string;
  content_zh: string;
  content_en: string;
  content_ja: string;
}

export default function PracticeArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) { setLoading(false); return; }
    sb.from('learn_articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setArticle(data as Article);
        setLoading(false);
      });
  }, [slug]);

  const titleOf = (a: Article) => (lang === 'en' ? a.title_en || a.title_zh : lang === 'ja' ? a.title_ja || a.title_zh : a.title_zh);
  const contentOf = (a: Article) => (lang === 'en' ? a.content_en || a.content_zh : lang === 'ja' ? a.content_ja || a.content_zh : a.content_zh);

  if (loading) {
    return (
      <PageShell label={t('learn.practice.label')} title={t('learn.practice.title')}>
        <p className="py-24 text-center text-sm text-muted/60">{t('learn.practice.loading')}</p>
      </PageShell>
    );
  }

  if (!article) {
    return (
      <PageShell label={t('learn.practice.label')} title={t('learn.practice.title')}>
        <Reveal className="flex flex-col items-center gap-6 py-24">
          <p className="text-sm text-muted">{t('learn.practice.notFound')}</p>
          <button onClick={() => router.push('/learn/practice')} className="glass-btn-primary text-sm">
            ← {t('learn.practice.back')}
          </button>
        </Reveal>
      </PageShell>
    );
  }

  const content = contentOf(article);

  return (
    <PageShell
      label={t(`learn.practice.cat.${article.category}`)}
      title={titleOf(article)}
      subtitle={lang === 'en' ? article.summary_en || article.summary_zh : lang === 'ja' ? article.summary_ja || article.summary_zh : article.summary_zh}
      wide
    >
      <Reveal className="mt-10">
        <button onClick={() => router.push('/learn/practice')} className="text-xs tracking-[0.15em] text-accent/80 transition-colors hover:text-accent">
          ← {t('learn.practice.back')}
        </button>
      </Reveal>

      {content ? (
        <Reveal delay={100}>
          <article className="prose-tarot mx-auto mt-8 max-w-3xl space-y-5 text-[15px] leading-relaxed text-frost/90">
            {content.split(/\n{2,}/).map((para, i) => {
              const p = para.trim();
              if (!p) return null;
              if (p.startsWith('## ')) return <h2 key={i} className="font-display pt-6 text-xl tracking-[0.1em] text-frost">{p.slice(3)}</h2>;
              if (p.startsWith('# ')) return <h1 key={i} className="font-display pt-6 text-2xl tracking-[0.1em] text-frost">{p.slice(2)}</h1>;
              if (p.startsWith('- ')) {
                const lines = p.split('\n').map((l) => l.replace(/^- /, ''));
                return (
                  <ul key={i} className="list-disc space-y-1.5 pl-6 text-muted">
                    {lines.map((l, j) => <li key={j}>{l}</li>)}
                  </ul>
                );
              }
              return <p key={i}>{p}</p>;
            })}
          </article>
        </Reveal>
      ) : (
        <Reveal delay={100}>
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-2xl">🌙</p>
            <p className="mt-4 text-sm text-muted">{t('learn.practice.writing')}</p>
          </div>
        </Reveal>
      )}
    </PageShell>
  );
}
