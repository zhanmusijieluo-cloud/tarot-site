'use client';

import { SPREADS, SPREAD_THEMES } from '@/lib/tarot';

const THEME_ORDER = ['general', 'love', 'career', 'wealth', 'choice', 'growth'];

export default function SpreadsSection() {
  const jump = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="spreads" className="relative border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-[90rem] px-8 py-36 sm:px-12">
        <div className="mb-24 text-center">
          <p className="text-xs tracking-[0.4em] text-accent/70 uppercase">Spread Library</p>
          <h2 className="font-display mt-8 text-5xl font-light tracking-[0.12em] text-frost sm:text-6xl">
            牌阵解析
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {Object.keys(SPREADS).length} 个经典牌阵，按场景分类。选一个你此刻需要的，进入在线抽牌。
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {THEME_ORDER.map((themeKey) => {
            const theme = SPREAD_THEMES[themeKey];
            const list = Object.entries(SPREADS).filter(([, s]) => s.theme === themeKey);
            if (list.length === 0) return null;
            return (
              <div key={themeKey} className="rounded-2xl border border-white/[0.06] bg-black/20 p-10">
                <div className="mb-8 flex items-center gap-4">
                  <span className="text-2xl" aria-hidden="true">{theme.icon}</span>
                  <div>
                    <h3 className="font-display text-xl tracking-[0.12em] text-frost">{theme.name}牌阵</h3>
                    <p className="mt-1 text-xs text-muted">{list.length} 种 · {theme.name}场景</p>
                  </div>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted/90">{theme.intro}</p>
                <ul className="space-y-2">
                  {list.map(([key, s]) => (
                    <li key={key}>
                      <button
                        onClick={() => jump('#draw')}
                        className="group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="text-sm text-frost/90 transition-colors group-hover:text-accent-soft">
                          {s.name}
                        </span>
                        <span className="text-xs text-muted/70">
                          {s.count} 张
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
