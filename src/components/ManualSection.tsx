'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TAROT_DECK } from '@/lib/tarot';
import { requestInterpret } from '@/lib/ai';
import { useI18n } from '@/i18n';
import LogoSpinner from '@/components/LogoSpinner';

type Status = 'idle' | 'loading' | 'result';

interface ManualCard {
  name: string;
  isReversed: boolean;
  upright: string;
  element: string;
}

/**
 * 手动输入解读：用户现实中已抽好牌，输入问题 + 牌面，AI 深度解析
 * 解析融合：元素（风火水土）、灵数、占星关联、原因、现状、推断、行动建议
 */
export default function ManualSection() {
  const { t, lang } = useI18n();
  const [question, setQuestion] = useState('');
  const [cardsText, setCardsText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  /* 解析用户输入的牌面文本（每行一张，支持 "恋人 正位" / "恋人 逆位" / 单独牌名） */
  const parsed = useMemo<ManualCard[]>(() => {
    const lines = cardsText.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const reversed = /逆|reversed/i.test(line);
      const namePart = line.replace(/[（(]?正[位]?[）)]?|[（(]?逆[位]?[）)]?/g, '').trim();
      const card = TAROT_DECK.find(
        (c) => c.name === namePart || c.name.includes(namePart) || namePart.includes(c.name)
      ) ?? TAROT_DECK.find((c) => namePart.includes(c.name));
      return {
        name: card?.name ?? (namePart || line),
        isReversed: reversed,
        upright: reversed ? (card?.reversedMeaning ?? '') : (card?.upright ?? ''),
        element: card?.element ?? '',
      };
    });
  }, [cardsText]);

  const validCount = parsed.length;

  const doInterpret = async () => {
    setStatus('loading');
    setError('');
    try {
      const payload = {
        cards: parsed.map((c) => ({
          name: c.name,
          isReversed: c.isReversed,
          upright: c.upright,
          element: c.element,
        })),
        question: question || t('manual.defaultQuestion'),
        spreadName: t('manual.manualEntry'),
        positions: parsed.map((_, i) => t('manual.cardN', { n: i + 1 })),
        // AI 解读语言跟随站点语言
        lang,
      };
      const { narrative } = await requestInterpret(payload);
      if (!narrative) throw new Error(t('manual.emptyResult'));
      setResult(narrative);
      setStatus('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('manual.networkError'));
      setStatus('result');
    }
  };

  const example = () => {
    setQuestion(t('manual.exampleQuestion'));
    setCardsText(t('manual.exampleCards'));
  };

  return (
    <section id="manual" className="relative mx-auto max-w-[90rem] px-8 py-16 sm:px-12">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        {/* 输入区 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 sm:p-12">
          <label className="mb-4 block text-sm text-muted">{t('manual.question')}</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('manual.questionPlaceholder')}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
          />

          <label className="mb-4 mt-10 block text-sm text-muted">{t('manual.cardsLabel')}</label>
          <textarea
            value={cardsText}
            onChange={(e) => setCardsText(e.target.value)}
            placeholder={t('manual.cardsPlaceholder')}
            rows={6}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-frost placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
          />

          {/* 解析预览 */}
          {validCount > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {parsed.map((c, i) => (
                <span key={i} className="liquid-glass rounded-full px-4 py-1.5 text-xs text-frost/90">
                  {c.name} · {c.isReversed ? t('online.reversed') : t('online.upright')}
                  {c.element && <span className="ml-1 text-muted">{c.element}</span>}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={doInterpret}
              disabled={validCount === 0 || status === 'loading'}
              className={`liquid-glass-strong rounded-full px-12 py-4 text-sm tracking-[0.2em] text-frost transition-all ${
                validCount === 0 ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/[0.03]'
              }`}
            >
              {status === 'loading' ? t('manual.loading') : t('manual.submit')}
            </button>
            <button onClick={example} className="liquid-glass rounded-full px-8 py-4 text-sm tracking-[0.12em] text-muted">
              {t('manual.example')}
            </button>
          </div>
          {validCount === 0 && cardsText.trim() !== '' && (
            <p className="mt-4 text-xs text-muted/80">{t('manual.notRecognized')}</p>
          )}
        </div>

        {/* 结果区 */}
        <div className="rounded-2xl border border-accent/10 bg-black/20 p-10 sm:p-12">
          {status === 'idle' && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <span className="text-4xl text-accent/50">✦</span>
              <p className="font-display mt-8 text-lg tracking-[0.15em] text-frost/80">{t('manual.resultTitle')}</p>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
                {t('manual.resultDesc')}
              </p>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <LogoSpinner size={64} />
              <p className="mt-8 text-sm text-muted">{t('manual.aiThinking')}</p>
            </div>
          )}
          {status === 'result' && (
            <div className="min-h-[360px]">
              {error && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">{error}</div>
              )}
              {result && (
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-muted [&_h1]:mb-6 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-frost [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-frost [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-frost [&_li]:ml-6 [&_li]:list-disc [&_p]:mb-4 [&_strong]:text-frost">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
