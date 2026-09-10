'use client';

import { useEffect, useMemo, useState } from 'react';
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

/** 把正文按 ## 切成章节（开头无 ## 的部分作为引言） */
interface Section {
  id: string;
  title: string;
  body: string;
}

function splitSections(content: string): { intro: string; sections: Section[] } {
  const blocks = content.split(/\n(?=## )/);
  const intro = !blocks[0]?.startsWith('## ') ? (blocks.shift() ?? '') : '';
  const sections = blocks.map((b, i) => {
    const nl = b.indexOf('\n');
    const title = (nl === -1 ? b.slice(3) : b.slice(3, nl)).trim();
    const body = nl === -1 ? '' : b.slice(nl + 1);
    return { id: `sec-${i}`, title, body };
  });
  return { intro, sections };
}

export default function PracticeArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  // 返回 = 撤销一步历史（浏览器返回键才会正确跳出本板块）；直接外链进入无历史时兜底跳列表
  const backToList = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/learn/practice');
  };

  const { intro, sections } = useMemo(() => {
    if (!article) return { intro: '', sections: [] as Section[] };
    return splitSections(contentOf(article));
  }, [article, lang]);

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
          <button onClick={backToList} className="glass-btn-primary text-sm">
            ← {t('learn.practice.back')}
          </button>
        </Reveal>
      </PageShell>
    );
  }

  const hasContent = !!(intro || sections.length);

  return (
    <PageShell
      label={t(`learn.practice.cat.${article.category}`)}
      title={titleOf(article)}
      subtitle={lang === 'en' ? article.summary_en || article.summary_zh : lang === 'ja' ? article.summary_ja || article.summary_zh : article.summary_zh}
      wide
    >
      <Reveal className="mt-10">
        <button onClick={backToList} className="text-xs tracking-[0.15em] text-accent/80 transition-colors hover:text-accent">
          ← {t('learn.practice.back')}
        </button>
      </Reveal>

      {!hasContent ? (
        <Reveal delay={100}>
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-2xl">🌙</p>
            <p className="mt-4 text-sm text-muted">{t('learn.practice.writing')}</p>
          </div>
        </Reveal>
      ) : (
        <div className="mx-auto mt-8 max-w-3xl">
          {/* 目录：点击跳转并展开对应章节 */}
          {sections.length > 0 && (
            <Reveal>
              <nav className="mb-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="font-display mb-4 text-xs tracking-[0.25em] text-accent/70 uppercase">{t('learn.practice.toc')}</p>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={() => setCollapsed((c) => ({ ...c, [s.id]: false }))}
                        className="flex items-baseline gap-2.5 text-sm text-muted transition-colors hover:text-accent"
                      >
                        <span className="font-display shrink-0 text-[11px] text-accent/60">{String(i + 1).padStart(2, '0')}</span>
                        <span className="leading-snug">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </Reveal>
          )}

          {/* 引言 */}
          {intro && (
            <Reveal delay={80}>
              <div className="mb-10">
                <Blocks text={intro} />
              </div>
            </Reveal>
          )}

          {/* 章节：可折叠卡片 */}
          <div className="space-y-5">
            {sections.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i * 40, 200)}>
                <section id={s.id} className="scroll-mt-28 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-8"
                  >
                    <h2 className="font-display text-base tracking-[0.08em] text-frost sm:text-lg">
                      <span className="mr-3 text-sm text-accent/70">{String(i + 1).padStart(2, '0')}</span>
                      {s.title}
                    </h2>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${collapsed[s.id] ? '' : 'rotate-180'}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {!collapsed[s.id] && (
                    <div className="px-6 pb-7 sm:px-8">
                      <Blocks text={s.body} />
                    </div>
                  )}
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

/** 行内 **加粗** */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((s, k) =>
        s.startsWith('**') && s.endsWith('**') && s.length > 4 ? (
          <strong key={k} className="font-medium text-frost">{s.slice(2, -2)}</strong>
        ) : (
          <span key={k}>{s}</span>
        )
      )}
    </>
  );
}

/** 轻量 markdown 块渲染：# / ## / - 列表 / 1. 编号列表（序号徽标） / 段落（单换行保留为换行） */
function Blocks({ text }: { text: string }) {
  return (
    <div className="space-y-5 text-[15px] leading-[1.9] text-frost/90">
      {text.split(/\n{2,}/).map((para, i) => {
        const p = para.trim();
        if (!p) return null;
        if (p.startsWith('### ')) return <h3 key={i} className="font-display pt-2 text-base tracking-[0.08em] text-frost">{p.slice(4)}</h3>;
        if (p.startsWith('## ')) return <h2 key={i} className="font-display pt-4 text-lg tracking-[0.08em] text-frost">{p.slice(3)}</h2>;
        if (p.startsWith('# ')) return <h1 key={i} className="font-display pt-4 text-xl tracking-[0.08em] text-frost">{p.slice(2)}</h1>;
        const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
        // 圆点列表
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="space-y-3.5 border-l border-accent/15 pl-5">
              {lines.map((l, j) => (
                <li key={j} className="relative text-muted">
                  <span className="absolute -left-[1.4rem] top-[0.75em] h-1.5 w-1.5 rounded-full bg-accent/50" />
                  <Rich text={l.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        // 编号列表：手动编号（保留原文序号），每条独立成块，续行归入该条
        if (/^\d+[.、]/.test(lines[0])) {
          const items: { num: string; lines: string[] }[] = [];
          for (const l of lines) {
            const m = l.match(/^(\d+)[.、]\s*(.*)$/);
            if (m) items.push({ num: m[1], lines: [m[2]] });
            else if (items.length) items[items.length - 1].lines.push(l);
            else items.push({ num: '', lines: [l] });
          }
          return (
            <div key={i} className="space-y-4">
              {items.map((it, j) => (
                <div key={j} className="flex gap-3">
                  {it.num && (
                    <span className="font-display mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-[11px] text-accent">
                      {it.num}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-muted">
                    {it.lines.map((l, k) => (
                      <p key={k} className={k > 0 ? 'mt-1.5' : ''}>
                        <Rich text={l} />
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        // 普通段落：单换行保留为换行
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Rich text={l} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
