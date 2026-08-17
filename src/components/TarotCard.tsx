'use client';

import { useState, useCallback } from 'react';

import { type DrawnCard } from '@/lib/tarot';

interface CardProps {
  card: DrawnCard;
  position: string;
  isReversed?: boolean;
  onClick: () => void;
  isFlipped: boolean;
}

export default function TarotCard({ card, position, isReversed = false, onClick, isFlipped }: CardProps) {
  return (
    <div className="card-slot fade-in">
      <div className="slot-label">{position}</div>
      <div 
        className={`card-wrapper ${isReversed ? 'card-reversed' : ''}`}
        onClick={onClick}
      >
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-front">
            <span className="card-front-symbol">✦</span>
          </div>
          <div className="card-back">
            <div className="card-back-numeral">{card.numeral}</div>
            <div className="card-back-image">{card.emoji}</div>
            <div className="card-back-name">{card.name}</div>
            <div className="card-back-type">
              {card.element}
              {card.zodiac ? ` · ${card.zodiac}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
