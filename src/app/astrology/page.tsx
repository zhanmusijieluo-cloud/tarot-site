'use client';

import { useState } from 'react';
import PageShell, { Reveal, SectionHead } from '@/components/PageShell';
import { useI18n } from '@/i18n';

const SIGNS = [
  { symbol: '♈', nameKey: 'zodiac.aries', en: 'Aries', date: '3.21 - 4.19', elementKey: 'element.fire', traitsKey: 'astro.traits.aries' },
  { symbol: '♉', nameKey: 'zodiac.taurus', en: 'Taurus', date: '4.20 - 5.20', elementKey: 'element.earth', traitsKey: 'astro.traits.taurus' },
  { symbol: '♊', nameKey: 'zodiac.gemini', en: 'Gemini', date: '5.21 - 6.21', elementKey: 'element.air', traitsKey: 'astro.traits.gemini' },
  { symbol: '♋', nameKey: 'zodiac.cancer', en: 'Cancer', date: '6.22 - 7.22', elementKey: 'element.water', traitsKey: 'astro.traits.cancer' },
  { symbol: '♌', nameKey: 'zodiac.leo', en: 'Leo', date: '7.23 - 8.22', elementKey: 'element.fire', traitsKey: 'astro.traits.leo' },
  { symbol: '♍', nameKey: 'zodiac.virgo', en: 'Virgo', date: '8.23 - 9.22', elementKey: 'element.earth', traitsKey: 'astro.traits.virgo' },
  { symbol: '♎', nameKey: 'zodiac.libra', en: 'Libra', date: '9.23 - 10.23', elementKey: 'element.air', traitsKey: 'astro.traits.libra' },
  { symbol: '♏', nameKey: 'zodiac.scorpio', en: 'Scorpio', date: '10.24 - 11.22', elementKey: 'element.water', traitsKey: 'astro.traits.scorpio' },
  { symbol: '♐', nameKey: 'zodiac.sagittarius', en: 'Sagittarius', date: '11.23 - 12.21', elementKey: 'element.fire', traitsKey: 'astro.traits.sagittarius' },
  { symbol: '♑', nameKey: 'zodiac.capricorn', en: 'Capricorn', date: '12.22 - 1.19', elementKey: 'element.earth', traitsKey: 'astro.traits.capricorn' },
  { symbol: '♒', nameKey: 'zodiac.aquarius', en: 'Aquarius', date: '1.20 - 2.18', elementKey: 'element.air', traitsKey: 'astro.traits.aquarius' },
  { symbol: '♓', nameKey: 'zodiac.pisces', en: 'Pisces', date: '2.19 - 3.20', elementKey: 'element.water', traitsKey: 'astro.traits.pisces' },
];

const PLANETS = [
  { symbol: '☉', nameKey: 'planet.sun', en: 'Sun', roleKey: 'astro.role.sun' },
  { symbol: '☽', nameKey: 'planet.moon', en: 'Moon', roleKey: 'astro.role.moon' },
  { symbol: '☿', nameKey: 'planet.mercury', en: 'Mercury', roleKey: 'astro.role.mercury' },
  { symbol: '♀', nameKey: 'planet.venus', en: 'Venus', roleKey: 'astro.role.venus' },
  { symbol: '♂', nameKey: 'planet.mars', en: 'Mars', roleKey: 'astro.role.mars' },
  { symbol: '♃', nameKey: 'planet.jupiter', en: 'Jupiter', roleKey: 'astro.role.jupiter' },
  { symbol: '♄', nameKey: 'planet.saturn', en: 'Saturn', roleKey: 'astro.role.saturn' },
  { symbol: '♅', nameKey: 'planet.uranus', en: 'Uranus', roleKey: 'astro.role.uranus' },
  { symbol: '♆', nameKey: 'planet.neptune', en: 'Neptune', roleKey: 'astro.role.neptune' },
  { symbol: '♇', nameKey: 'planet.pluto', en: 'Pluto', roleKey: 'astro.role.pluto' },
];

const HOUSES = [
  { no: 1, nameKey: 'astro.house.1', domainKey: 'astro.house.1d' },
  { no: 2, nameKey: 'astro.house.2', domainKey: 'astro.house.2d' },
  { no: 3, nameKey: 'astro.house.3', domainKey: 'astro.house.3d' },
  { no: 4, nameKey: 'astro.house.4', domainKey: 'astro.house.4d' },
  { no: 5, nameKey: 'astro.house.5', domainKey: 'astro.house.5d' },
  { no: 6, nameKey: 'astro.house.6', domainKey: 'astro.house.6d' },
  { no: 7, nameKey: 'astro.house.7', domainKey: 'astro.house.7d' },
  { no: 8, nameKey: 'astro.house.8', domainKey: 'astro.house.8d' },
  { no: 9, nameKey: 'astro.house.9', domainKey: 'astro.house.9d' },
  { no: 10, nameKey: 'astro.house.10', domainKey: 'astro.house.10d' },
  { no: 11, nameKey: 'astro.house.11', domainKey: 'astro.house.11d' },
  { no: 12, nameKey: 'astro.house.12', domainKey: 'astro.house.12d' },
];

const ASPECTS = [
  { symbol: '☌', nameKey: 'astro.aspect.conjunction', angle: '0°', meaningKey: 'astro.aspect.conjM' },
  { symbol: '⚹', nameKey: 'astro.aspect.sextile', angle: '60°', meaningKey: 'astro.aspect.sextM' },
  { symbol: '□', nameKey: 'astro.aspect.square', angle: '90°', meaningKey: 'astro.aspect.sqM' },
  { symbol: '△', nameKey: 'astro.aspect.trine', angle: '120°', meaningKey: 'astro.aspect.triM' },
  { symbol: '☍', nameKey: 'astro.aspect.opposition', angle: '180°', meaningKey: 'astro.aspect.oppM' },
];

const ELEMENT_COLOR: Record<string, string> = {
  '火': 'text-[#e8a08a]',
  '土': 'text-[#cdb88a]',
  '风': 'text-[#9cc3d8]',
  '水': 'text-[#8aa8d8]',
};

export default function AstrologyPage() {
  const { t } = useI18n();
  const [activeSign, setActiveSign] = useState<number | null>(null);
  const sign = activeSign !== null ? SIGNS[activeSign] : null;

  return (
    <PageShell
      label={t('page.astrology.label')}
      title={t('page.astrology.title')}
      subtitle={t('page.astrology.subtitle')}
      wide
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          {t('page.astrology.footer')}
        </p>
      }
    >
      {/* 十二星座 */}
      <section className="mb-20 mt-12 sm:mb-28">
        <SectionHead no="01" title={t('astrology.signSection')} sub={t('astrology.signSub')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {SIGNS.map((s, i) => (
            <Reveal key={s.nameKey} delay={(i % 6) * 60}>
              <button
                onClick={() => setActiveSign(i)}
                className="group h-full w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-accent/[0.05]"
              >
                <span
                  className="block text-2xl transition-all duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(200,216,255,0.35))' }}
                >
                  {s.symbol}
                </span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.1em] text-frost">
                  {t(s.nameKey)}
                </span>
                <span className="mt-1 block text-[10px] tracking-wide text-muted/80">{s.date}</span>
                <span className={`mt-1.5 block text-[11px] ${ELEMENT_COLOR[s.elementKey === 'element.fire' ? '火' : s.elementKey === 'element.earth' ? '土' : s.elementKey === 'element.air' ? '风' : '水']}`}>
                  {t(s.elementKey)} · {t(s.traitsKey)}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十大行星 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="02" title={t('astrology.planetSection')} sub={t('astrology.planetSub')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLANETS.map((p, i) => (
            <Reveal key={p.nameKey} delay={(i % 5) * 70}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-300 hover:border-accent/25">
                <span className="block text-2xl text-metal/90">{p.symbol}</span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.12em] text-frost">
                  {t(p.nameKey)}
                </span>
                <span className="mt-0.5 block text-[9px] tracking-[0.25em] text-muted/60 uppercase">
                  {p.en}
                </span>
                <span className="mt-2 block text-[11px] leading-snug text-muted">{t(p.roleKey)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 十二宫位 */}
      <section className="mb-20 sm:mb-28">
        <SectionHead no="03" title={t('astrology.houseSection')} sub={t('astrology.houseSub')} />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {HOUSES.map((h, i) => (
            <Reveal key={h.no} delay={(i % 3) * 70}>
              <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-accent/25">
                <span className="font-display w-7 shrink-0 text-lg font-extralight text-accent/60">
                  {h.no}
                </span>
                <div>
                  <span className="font-display text-sm tracking-[0.15em] text-frost">{t(h.nameKey)}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{t(h.domainKey)}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 五大相位 */}
      <section className="mb-8">
        <SectionHead no="04" title={t('astrology.aspectSection')} sub={t('astrology.aspectSub')} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {ASPECTS.map((a, i) => (
            <Reveal key={a.nameKey} delay={i * 70}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center transition-all duration-300 hover:border-accent/25">
                <span className="block text-2xl text-metal/90">{a.symbol}</span>
                <span className="font-display mt-2.5 block text-sm tracking-[0.15em] text-frost">
                  {t(a.nameKey)}
                </span>
                <span className="mt-0.5 block text-[11px] tracking-[0.2em] text-accent/70">
                  {a.angle}
                </span>
                <span className="mt-2 block text-[11px] leading-snug text-muted">{t(a.meaningKey)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 星座详情浮层 */}
      {sign && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
          onClick={() => setActiveSign(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="glass-panel relative w-full max-w-xs rounded-3xl p-7 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'rise-in 0.5s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <span
              className="block text-4xl"
              style={{ filter: 'drop-shadow(0 0 12px rgba(200,216,255,0.5))' }}
            >
              {sign.symbol}
            </span>
            <h3 className="font-display mt-3 text-xl tracking-[0.2em] text-frost">{t(sign.nameKey)}</h3>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-muted/70 uppercase">{sign.en}</p>
            <div className="hairline-glow mx-auto my-5 w-20" />
            <div className="space-y-2.5 text-[13px]">
              <p className="text-muted">
                {t('astrology.date')} · <span className="text-frost/85">{sign.date}</span>
              </p>
              <p className="text-muted">
                {t('astrology.element')} · <span className={`${ELEMENT_COLOR[sign.elementKey === 'element.fire' ? '火' : sign.elementKey === 'element.earth' ? '土' : sign.elementKey === 'element.air' ? '风' : '水']}`}>{t(sign.elementKey)}</span>
              </p>
              <p className="text-muted">
                {t('astrology.traits')} · <span className="text-frost/85">{t(sign.traitsKey)}</span>
              </p>
            </div>
            <button
              onClick={() => setActiveSign(null)}
              className="glass-btn mt-6 w-full text-xs tracking-[0.2em]"
            >
              {t('astrology.close')}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
