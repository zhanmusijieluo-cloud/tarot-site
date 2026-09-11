'use client';

/**
 * 雷诺曼主页：占卜区置顶（快速占卜 + 常用牌阵），牌墙详解区在下。
 * 牌阵数据全部来自 lib/lenormand 的 LN_SPREADS（内置三语, 页面按站点语言取用）。
 */
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import { LN_CARDS, LN_SPREADS, LN_SPREAD_KEYS, lnImage } from '@/lib/lenormand';

const LUCKY_TIP =
  '🍀 雷诺曼小贴士：三张牌连读成一句话——比如「信 + 骑士 + 鹳」＝「一封改变处境的消息」';

export default function LenormandPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const L = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'zh';

  const goSpread = (key: string) => router.push(`/lenormand/draw?spread=${key}`);

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
    >
      {/* ═══ 占卜区（置顶）：快速占卜 + 常用牌阵 ═══ */}
      <section className="mt-10 mb-16 sm:mt-14 sm:mb-20">
        <SectionHead no="01" title={t('lnflow.sectionTitle')} sub={t('lnflow.sectionSub')} />

        {/* 快速占卜 · 三张时光线（大主按钮） */}
        <Reveal>
          <button
            onClick={() => goSpread('ln3a')}
            className="group relative block w-full overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.10] via-white/[0.02] to-accent/[0.05] p-7 text-left transition-all duration-300 hover:border-accent/50 hover:shadow-[0_0_40px_-12px] hover:shadow-accent/30 sm:p-9"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-accent/80 uppercase">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('lnflow.quickBadge')}
                </p>
                <h3 className="font-display mt-3 text-xl tracking-[0.1em] text-frost sm:text-2xl">
                  {t('lnflow.quickTitle')}
                </h3>
                <p className="mt-2.5 max-w-xl text-[12px] leading-relaxed text-muted">
                  {LN_SPREADS.ln3a.sub[L]}
                </p>
              </div>
              {/* 三张卡背示意 */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-[52px] rounded-lg opacity-90 shadow-lg shadow-black/50 ring-1 ring-white/10 transition-transform duration-300 sm:w-[64px]"
                    style={{
                      aspectRatio: '10 / 15',
                      transform: `rotate(${(i - 1) * 6}deg) translateY(${i === 1 ? -6 : 0}px)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/cards/card-back-new.webp" alt="" className="h-full w-full rounded-lg object-cover" />
                  </div>
                ))}
                <span className="font-display ml-2 hidden text-sm tracking-[0.2em] text-accent/85 transition-transform duration-300 group-hover:translate-x-1 sm:block">
                  {t('lnflow.quickGo')} →
                </span>
              </div>
            </div>
            <p className="mt-5 border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-muted/70">{LUCKY_TIP}</p>
          </button>
        </Reveal>

        {/* 常用牌阵 */}
        <Reveal delay={120}>
          <h3 className="font-display mb-4 mt-10 text-xs tracking-[0.25em] text-muted/80 uppercase">
            {t('lnflow.spreadsTitle')}
          </h3>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LN_SPREAD_KEYS.map((key, i) => {
            const sp = LN_SPREADS[key];
            return (
              <Reveal key={key} delay={i * 90}>
                <button
                  onClick={() => goSpread(key)}
                  className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-accent/[0.05]"
                >
                  {/* 迷你阵位示意：真实鎏金卡背微缩图（与快速占卜大卡同源图） */}
                  <div className="relative mb-4 h-[64px] w-full">
                    {SPREAD_MINI[key].map((pt, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        src="/cards/card-back-new.webp"
                        alt=""
                        loading="lazy"
                        className="absolute h-[20px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-[3px] opacity-85 shadow-[0_2px_6px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-all duration-300 group-hover:opacity-100 group-hover:ring-accent/40"
                        style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-display text-sm tracking-[0.1em] text-frost">{sp.name[L]}</h4>
                    <span className="shrink-0 text-[10px] tracking-[0.2em] text-muted/60">{t('common.cardsCount', { count: sp.count })}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">{sp.sub[L]}</p>
                  <span className="mt-3 block text-[11px] tracking-[0.12em] text-muted/50 transition-colors group-hover:text-accent">
                    {t('lnflow.start')} →
                  </span>
                </button>
              </Reveal>
            );
          })}
          {/* 自定义牌阵：布阵页入口（虚线卡, 对齐塔罗 /spreads 样式） */}
          <Reveal delay={360}>
            <button
              onClick={() => router.push('/lenormand/custom')}
              className="group h-full w-full rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] p-5 text-left transition-all duration-300 hover:border-accent/70 hover:bg-accent/[0.08]"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] tracking-[0.25em] text-accent/70 uppercase">
                  ✦ · {t('online.customSpreadCount')}
                </span>
              </div>
              <h3 className="font-display mt-2.5 text-base tracking-[0.1em] text-frost">
                {t('lnflow.customEntry')}
              </h3>
              <p className="mt-1 text-xs text-muted">{t('lnflow.customEntrySub')}</p>
              <span className="mt-3 block text-[11px] tracking-[0.12em] text-muted/50 transition-colors group-hover:text-accent">
                {t('lnflow.start')} →
              </span>
            </button>
          </Reveal>
        </div>
      </section>

      {/* ═══ 牌墙详解区 ═══ */}
      <section className="mb-20 sm:mb-28">
        <SectionHead
          no="02"
          title={t('lenormand.cardSection')}
          sub={t('lenormand.cardSub')}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
          {LN_CARDS.map((c, i) => (
            <Reveal key={c.id} delay={(i % 9) * 55}>
              <button
                onClick={() => router.push(`/lenormand/card/${c.id}`)}
                className="group flex h-full w-full flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center transition-all duration-300 hover:border-accent/40 hover:bg-accent/[0.05] hover:-translate-y-1"
              >
                {/* 1780年《希望之戏》公有领域牌面 */}
                <div
                  className="w-full overflow-hidden rounded-md shadow-md shadow-black/30 transition-transform duration-200 group-hover:scale-105"
                  style={{ aspectRatio: '10 / 15' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lnImage(c.id)}
                    alt={t(`ln.${c.i18nIndex}.name`)}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="mt-2.5 font-display text-xs tracking-[0.1em] text-frost">
                  {c.id}. {t(`ln.${c.i18nIndex}.name`)}
                </span>
                <span className="mt-1 block text-[10px] leading-snug text-muted/80">
                  {kwPreview(t(`ln.${c.i18nIndex}.kw`))}
                </span>
                <span className="mt-1.5 hidden text-[10px] tracking-[0.12em] text-accent/0 transition-colors group-hover:text-accent/80 sm:block">
                  {t('lenormand.enter')} →
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

/** 牌阵迷你示意图坐标（与 spread-layout 真实布局同构, 按 key 静态镜像） */
const SPREAD_MINI: Record<string, { x: number; y: number }[]> = {
  ln3a: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
  ln3b: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
  ln5: [{ x: 10, y: 50 }, { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, { x: 90, y: 50 }],
  ln9: [
    { x: 24, y: 18 }, { x: 50, y: 18 }, { x: 76, y: 18 },
    { x: 24, y: 50 }, { x: 50, y: 50 }, { x: 76, y: 50 },
    { x: 24, y: 82 }, { x: 50, y: 82 }, { x: 76, y: 82 },
  ],
};
