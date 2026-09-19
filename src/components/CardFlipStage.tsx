'use client';

import { getCardImage, type DrawnCard } from '@/lib/tarot';
import { localizedCardName } from '@/lib/card-names';
import { useI18n } from '@/i18n';

const CARD_BACK = '/cards/card-back-new.webp';

interface CardFlipStageProps {
  cards: DrawnCard[];
  /** flipped[i] 对应 cards[i]；翻开与否由父级持有，好在按钮上判"全部翻开才放行" */
  flipped: boolean[];
  onFlip: (index: number) => void;
  positions?: string[];
  deck?: 'tarot' | 'lenormand';
}

/**
 * 翻牌阶段：牌与正逆位在洗牌那一刻就已固定，这里逐张点开只是揭示。
 * 逆位用 rotate(180deg) 呈现，与解读室牌阵窗口同一套画法。
 */
export default function CardFlipStage({ cards, flipped, onFlip, positions, deck = 'tarot' }: CardFlipStageProps) {
  const { t, lang } = useI18n();
  const showOrientation = deck !== 'lenormand';
  const cardRatio = deck === 'lenormand' ? '520 / 670' : '2 / 3.4';

  return (
    <div className="flex flex-wrap items-start justify-center gap-4 px-2 sm:gap-6">
      {cards.map((card, i) => {
        const open = !!flipped[i];
        const name = localizedCardName(card, lang);
        const orientation = showOrientation ? (card.isReversed ? t('online.reversed') : t('online.upright')) : '';
        return (
          <div key={`${card.id}-${i}`} className="flex w-[104px] flex-col items-center sm:w-[128px]">
            <button
              type="button"
              onClick={() => { if (!open) onFlip(i); }}
              aria-label={open ? (showOrientation ? `${name} · ${orientation}` : name) : t('flip.cardBackAria', { n: i + 1 })}
              aria-pressed={open}
              style={{ aspectRatio: cardRatio }}
              className={`relative block w-full [perspective:1000px] ${open ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div
                className={`relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] ${
                  open ? '[transform:rotateY(180deg)]' : 'group-hover:-translate-y-1'
                }`}
              >
                <div className="absolute inset-0 overflow-hidden rounded-md shadow-md shadow-black/50 [backface-visibility:hidden]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={CARD_BACK} alt="" draggable={false} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-3 text-center text-[10px] tracking-[0.25em] text-accent/75">
                    {t('flip.tap')}
                  </span>
                </div>
                <div className="absolute inset-0 overflow-hidden rounded-md shadow-md shadow-black/50 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCardImage(card.id, deck === 'lenormand' ? 'lenormand' : undefined)}
                    alt=""
                    draggable={false}
                    loading="eager"
                    style={{ transform: showOrientation && card.isReversed ? 'rotate(180deg)' : 'none' }}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/85 text-[9px] font-medium text-black">
                {i + 1}
              </span>
            </button>

            <p className="mt-3 text-center text-[11px] leading-snug text-frost">
              {open ? name : <span className="text-muted/45">{'?'}</span>}
            </p>
            {open && showOrientation && (
              <p className={`text-center text-[10px] ${card.isReversed ? 'text-muted' : 'text-accent/80'}`}>{orientation}</p>
            )}
            {positions?.[i] && (
              <p className="mt-1 line-clamp-2 text-center text-[10px] leading-tight text-accent/70">{positions[i]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
