'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

export default function ClosingSection() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <section id="closing-section" className="relative w-full overflow-hidden">
      {/* 氛围光晕——低饱和雾粉 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,168,184,0.07), transparent 60%), radial-gradient(ellipse 40% 35% at 15% 85%, rgba(217,168,184,0.04), transparent 55%), radial-gradient(ellipse 40% 35% at 85% 85%, rgba(217,168,184,0.04), transparent 55%)',
        }}
      />

      {/* 主行动区 */}
      <div className="relative z-10 mx-auto w-[calc(100%-3rem)] max-w-[90rem] py-20 text-center sm:w-[calc(100%-4rem)] sm:py-28">
        <h3 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-light tracking-[0.1em] text-frost">
          {t('closing.title')}
        </h3>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">
          {t('closing.desc')}
        </p>
        <button onClick={() => router.push('/online')} className="btn-rose mt-9">
          {t('closing.cta')}
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* 品牌宣言 */}
      <div className="relative z-10 mx-auto w-[calc(100%-3rem)] max-w-[90rem] pb-24 text-center sm:w-[calc(100%-4rem)]">
        <div className="flex items-center justify-center gap-4">
          <svg viewBox="0 0 1200 852" className="h-12 w-auto text-accent/50" aria-hidden="true">
            <defs>
              <mask id="footerMoonMask">
                <rect width="1200" height="852" fill="white" />
                <circle cx="625" cy="348" r="74" fill="black">
                  <animate
                    attributeName="r"
                    values="74;74;0;0;74"
                    keyTimes="0;0.15;0.5;0.75;1"
                    dur="6s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
                  />
                </circle>
              </mask>
            </defs>
            <circle cx="603" cy="374" r="96" fill="currentColor" mask="url(#footerMoonMask)">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 603 374;540 603 374;1080 603 374"
                keyTimes="0;0.55;1"
                dur="6s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.55 0.06 0.3 1;0.55 0.06 0.3 1"
              />
            </circle>
            <g fill="currentColor">
              <path d="M 475 410 L 475 418 L 414 438 Z" />
              <path d="M 729 410 L 729 418 L 789 438 Z" />
              <path d="M 503 453 L 514 464 L 397 570 Z" />
              <path d="M 691 464 L 702 453 L 809 570 Z" />
              <path d="M 547 486 L 559 490 L 522 566 Z" />
              <path d="M 647 490 L 659 486 L 683 566 Z" />
              <path d="M 598 495 L 614 495 L 606 760 Z" />
            </g>
          </svg>
          <h2 className="font-display text-[clamp(1.8rem,3.6vw,3rem)] font-light tracking-[0.14em] text-frost">
            {t('closing.brand')}
          </h2>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted">
          {t('closing.brandDesc')}
        </p>
      </div>

      {/* 页脚 */}
      <footer className="relative z-10 mx-auto w-[calc(100%-3rem)] max-w-[90rem] pb-12 sm:w-[calc(100%-4rem)]">
        <div className="border-t border-white/[0.06] pt-8 text-center">
          <p className="text-xs leading-relaxed text-muted/70">
            {t('closing.copyright')}
          </p>
        </div>
      </footer>
    </section>
  );
}
