'use client';

import { useState } from 'react';
import PageShell, { Reveal } from '@/components/PageShell';

const ZODIAC_SIGNS = [
  { symbol: '♈', name: '白羊座', en: 'Aries', date: '3.21 - 4.19' },
  { symbol: '♉', name: '金牛座', en: 'Taurus', date: '4.20 - 5.20' },
  { symbol: '♊', name: '双子座', en: 'Gemini', date: '5.21 - 6.21' },
  { symbol: '♋', name: '巨蟹座', en: 'Cancer', date: '6.22 - 7.22' },
  { symbol: '♌', name: '狮子座', en: 'Leo', date: '7.23 - 8.22' },
  { symbol: '♍', name: '处女座', en: 'Virgo', date: '8.23 - 9.22' },
  { symbol: '♎', name: '天秤座', en: 'Libra', date: '9.23 - 10.23' },
  { symbol: '♏', name: '天蝎座', en: 'Scorpio', date: '10.24 - 11.22' },
  { symbol: '♐', name: '射手座', en: 'Sagittarius', date: '11.23 - 12.21' },
  { symbol: '♑', name: '摩羯座', en: 'Capricorn', date: '12.22 - 1.19' },
  { symbol: '♒', name: '水瓶座', en: 'Aquarius', date: '1.20 - 2.18' },
  { symbol: '♓', name: '双鱼座', en: 'Pisces', date: '2.19 - 3.20' },
];

export default function DailyPage() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <PageShell
      label="Daily · Fortune"
      title="每日运势"
      subtitle="每天一张牌，聆听宇宙的低语"
      footer={
        <p className="text-[11px] tracking-[0.3em] text-muted/70">
          今日运势 · 每日更新
        </p>
      }
    >
      <Reveal className="mt-8">
        <p className="text-center text-sm text-muted mb-8">
          选择你的星座，获取今日专属运势指引
        </p>
      </Reveal>

      <Reveal delay={200}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {ZODIAC_SIGNS.map((z, i) => (
            <Reveal key={z.name} delay={i * 60}>
              <button
                onClick={() => setSelected(i)}
                className={`group flex flex-col items-center rounded-2xl border p-4 transition-all duration-300 ${
                  selected === i
                    ? 'border-accent/50 bg-accent/15'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-accent/30'
                }`}
              >
                <span
                  className="text-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ filter: selected === i ? 'drop-shadow(0 0 10px rgba(155,140,255,0.6))' : 'none' }}
                >
                  {z.symbol}
                </span>
                <span className="mt-2 font-display text-xs tracking-[0.1em] text-frost">
                  {z.name}
                </span>
                <span className="mt-0.5 text-[9px] text-muted/70">{z.date}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {selected !== null && (
        <Reveal delay={400}>
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <span className="text-4xl">🌙</span>
            <h3 className="font-display mt-3 text-lg tracking-[0.15em] text-frost">
              {ZODIAC_SIGNS[selected].name} · 每日指引
            </h3>
            <p className="mt-2 text-sm text-muted">请连接后端服务获取实时运势</p>
          </div>
        </Reveal>
      )}
    </PageShell>
  );
}
