'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, User, HelpCircle } from 'lucide-react';
import PageShell, { Reveal } from '@/components/PageShell';
import { useI18n } from '@/i18n';

/**
 * 快速占卜 · 问问题页
 * 填写「问题」与「问题背景」后进入三张无牌阵抽牌流程
 * 支持从抽牌页返回时通过 URL 参数回填已填内容，方便修改后重新开始
 */
function QuickInner() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const [background, setBackground] = useState(searchParams.get('bg') ?? '');

  const start = () => {
    if (!question.trim()) return;
    const q = encodeURIComponent(question.trim());
    const bg = encodeURIComponent(background.trim());
    router.push(`/online?spread=quick&q=${q}&bg=${bg}`);
  };

  return (
    <PageShell
      label={t('quick.label')}
      title={t('quick.title')}
      subtitle={t('quick.subtitle')}
    >
      <div className="mx-auto mt-10 w-full max-w-2xl sm:mt-14">
        <Reveal>
          {/* 问题输入 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
                <HelpCircle className="h-4 w-4" />
              </span>
              <label htmlFor="quick-question" className="font-display text-sm tracking-[0.2em] text-frost">
                {t('quick.questionLabel')}
              </label>
            </div>
            <textarea
              id="quick-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('quick.questionPlaceholder')}
              maxLength={120}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
            />
            <p className="mt-2 text-right text-[11px] text-muted/60">{question.length} / 120</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          {/* 背景输入 */}
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent" aria-hidden="true">
                <User className="h-4 w-4" />
              </span>
              <label htmlFor="quick-background" className="font-display text-sm tracking-[0.2em] text-frost">
                {t('quick.bgLabel')}
              </label>
            </div>
            <textarea
              id="quick-background"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder={t('quick.bgPlaceholder')}
              maxLength={300}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-frost placeholder:text-muted/50 focus:border-accent/40 focus:outline-none"
            />
            <p className="mt-2 text-right text-[11px] text-muted/60">{background.length} / 300</p>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={start}
              disabled={!question.trim()}
              className={`glass-btn-primary w-full text-sm tracking-[0.25em] sm:w-auto sm:px-12 ${
                !question.trim() ? 'opacity-40' : ''
              }`}
            >
              <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
              {t('quick.start')}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted/60">
              {t('quick.hint')}
            </p>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}

export default function QuickPage() {
  return (
    <Suspense fallback={<div className="min-h-[56.25rem] w-full" />}>
      <QuickInner />
    </Suspense>
  );
}
