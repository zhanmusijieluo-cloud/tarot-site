'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell, { Reveal } from '@/components/PageShell';
import { useI18n } from '@/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LN_CARDS, lnCard, lnImage } from '@/lib/lenormand';

/** 雷诺曼单牌详解数据（与 public/data/ln-details.json 一致） */
interface LnLangContent {
  core: string;
  domains: { love: string; career: string; wealth: string; health: string };
  pairing: string;
  playing: string;
  timing: string;
  shadow: string;
}
interface LnDetail {
  id: number;
  zh: LnLangContent;
  en: LnLangContent;
  ja: LnLangContent;
}

/** 板块元数据：键 → i18n 翻译键 → 图标（domains 特殊处理） */
const BLOCKS = [
  { key: 'core', icon: '💠' },
  { key: 'domains', icon: '🧭' },
  { key: 'pairing', icon: '🔗' },
  { key: 'playing', icon: '🃏' },
  { key: 'timing', icon: '⏳' },
  { key: 'shadow', icon: '🌒' },
] as const;

const DOMAIN_META = [
  { key: 'love', icon: '❤️' },
  { key: 'career', icon: '💼' },
  { key: 'wealth', icon: '💰' },
  { key: 'health', icon: '🌿' },
] as const;

export default function LnCardDetailPage() {
  const { id } = useParams();
  const cardId = parseInt(String(id), 10);
  const router = useRouter();
  const { t, lang } = useI18n();
  const [details, setDetails] = useState<LnDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 返回 = 撤销一步历史(浏览器返回键才能正确跳出本板块); 直链进入无历史时兜底跳牌墙
  const backToWall = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/lenormand');
  };
  // 上/下一张 = 替换当前历史记录, 不往栈里摞牌
  const goCard = (target: number) => router.replace(`/lenormand/card/${target}`);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/ln-details.json')
      .then((r) => r.json())
      .then((all: LnDetail[]) => {
        if (cancelled) return;
        setDetails(all.find((d) => d.id === cardId) || null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(null);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const card = lnCard(cardId);

  if (!card) {
    return (
      <PageShell label={t('page.lenormand.label')} title={t('page.lenormand.title')}>
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <p className="text-4xl opacity-60">🕯️</p>
          <button onClick={backToWall} className="text-accent underline underline-offset-4">
            ← {t('common.back')}
          </button>
        </div>
      </PageShell>
    );
  }

  const langKey = (lang === 'en' || lang === 'ja' ? lang : 'zh') as 'zh' | 'en' | 'ja';
  const name = t(`ln.${card.i18nIndex}.name`);
  const kw = t(`ln.${card.i18nIndex}.kw`);
  const prev = cardId > 1 ? cardId - 1 : 36;
  const next = cardId < 36 ? cardId + 1 : 1;

  const content = loaded ? details?.[langKey] : null;

  return (
    <PageShell
      label={t('page.lenormand.label')}
      title={`${cardId}. ${name}`}
      subtitle={kw}
      wide
    >
      {/* 返回牌墙 */}
      <div className="mb-10">
        <button
          onClick={backToWall}
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] text-muted transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" /> {t('lenormand.detail.back')}
        </button>
      </div>

      <section className="grid gap-10 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Reveal>
          <div className="mx-auto w-full max-w-[340px] lg:sticky lg:top-28">
            <div
              className="w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10"
              style={{ aspectRatio: '10 / 15' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lnImage(cardId)} alt={name} className="h-full w-full object-cover" />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] tracking-[0.15em] text-muted/80">
                No.{String(cardId).padStart(2, '0')} / 36
              </span>
              <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] tracking-[0.15em] text-muted/80">
                {t('lenormand.detail.playing')} · {card.playing}
              </span>
            </div>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-8">
          {!loaded && (
            <div className="flex items-center justify-center py-32">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            </div>
          )}
          {loaded && !content && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <p className="text-2xl">🌙</p>
              <p className="mt-4 text-sm text-muted">{t('learn.practice.writing')}</p>
            </div>
          )}
          {content &&
            BLOCKS.map((block, i) => {
              const isDomains = block.key === 'domains';
              const text = isDomains ? null : (content as unknown as Record<string, string>)[block.key];
              if (!isDomains && !text) return null;
              return (
                <Reveal key={block.key} delay={Math.min((i % 4) * 60, 180)}>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <h3 className="mb-4 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-base">
                        {block.icon}
                      </span>
                      <span className="font-display text-sm tracking-[0.18em] text-frost uppercase">
                        {t(`lenormand.detail.${block.key}`)}
                      </span>
                    </h3>
                    {isDomains ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {DOMAIN_META.map((dm) => (
                          <div key={dm.key} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                            <p className="mb-2 flex items-center gap-2 text-xs tracking-[0.15em] text-frost">
                              <span>{dm.icon}</span> {t(`lenormand.detail.d_${dm.key}`)}
                            </p>
                            <p className="text-[13px] leading-[1.9] text-muted/90">{content.domains[dm.key]}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(text as string)
                          .split('\n')
                          .filter((p) => p.trim().length > 0)
                          .map((para, j) => (
                            <p key={j} className="text-[13px] leading-[1.9] text-muted/90">
                              {para}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}

          {/* 无逆位提示: 雷诺曼特色, 固定说明卡 */}
          <Reveal>
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.04] p-6">
              <p className="text-[13px] leading-[1.9] text-muted/90">
                <span className="mr-2">ℹ️</span>
                {t('lenormand.detail.noReversed')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 上下张导航 */}
      <div className="mt-16 grid gap-3 border-t border-white/[0.06] pt-8 sm:grid-cols-2">
        <button
          onClick={() => goCard(prev)}
          className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-accent/30 hover:bg-accent/[0.05]"
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:-translate-x-1" />
          <span className="min-w-0">
            <span className="block text-[10px] tracking-[0.2em] text-muted/60 uppercase">{t('learn.detail.prev')}</span>
            <span className="block truncate text-sm text-frost">
              {prev}. {t(`ln.${prev - 1}.name`)}
            </span>
          </span>
        </button>
        <button
          onClick={() => goCard(next)}
          className="group flex items-center justify-end gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-right transition-all hover:border-accent/30 hover:bg-accent/[0.05]"
        >
          <span className="min-w-0">
            <span className="block text-[10px] tracking-[0.2em] text-muted/60 uppercase">{t('learn.detail.next')}</span>
            <span className="block truncate text-sm text-frost">
              {next}. {t(`ln.${next - 1}.name`)}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </PageShell>
  );
}
