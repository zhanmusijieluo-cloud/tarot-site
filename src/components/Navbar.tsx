'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type Lang } from '@/i18n';

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'zh', label: '中文', flag: '中' },
  { code: 'ja', label: '日本語', flag: '日' },
];

export default function Navbar() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (route: string) => {
    setMenuOpen(false);
    if (route.startsWith('#')) {
      document.querySelector(route)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(route);
    }
  };

  const pickLang = (code: Lang) => {
    setLang(code);
    setLangOpen(false);
    setMenuOpen(false);
  };

  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/[0.06] bg-[rgba(9,8,10,0.88)] backdrop-blur-2xl'
          : 'border-b border-white/[0.04] bg-[rgba(9,8,10,0.6)] backdrop-blur-xl'
      }`}
    >
      <nav className="mx-auto flex h-[4.5rem] w-[calc(100%-3rem)] max-w-[90rem] items-center justify-between px-0 sm:w-[calc(100%-4rem)]">
        {/* Logo */}
        <button
          onClick={() => {
            setMenuOpen(false);
            if (window.location.pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              router.push('/');
            }
          }}
          className="flex items-center gap-1"
          aria-label="Back to home"
        >
          <svg viewBox="0 0 1200 852" className="h-10 w-auto" aria-hidden="true">
            <defs>
              <mask id="navMoonMask">
                <rect width="1200" height="852" fill="white" />
                <circle cx="625" cy="348" r="74" fill="black">
                  {/* 内圆半径动画：r=74 裁掉一角=月牙 → r 缩到 0 不裁切=完整圆(太阳) → 收回月牙。
                      张开/收回与旋转同步进行：边转边变圆 */}
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
            <circle cx="603" cy="374" r="96" fill="currentColor" mask="url(#navMoonMask)">
              {/* 旋转：SMIL 与半径动画同一时间线，天然同步循环。
                  总角 1080°=3 整圈 → 终点视觉=起点，无缝循环 */}
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
          <span className="font-display text-base font-semibold tracking-[0.22em] text-frost uppercase whitespace-nowrap sm:text-lg">
            Mumu <span className="text-accent">Tarot</span>
          </span>
        </button>

        {/* 返回主页 + 账户操作 + 语言切换 */}
        <div className="hidden items-center gap-1 md:flex">
          {/* 返回主页 */}
          <button
            onClick={() => go('/')}
            aria-label="Home"
            className="flex h-9 w-9 items-center justify-center rounded-full text-frost/60 transition-all hover:bg-white/[0.06] hover:text-frost"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[1.1rem] w-[1.1rem]"
              aria-hidden="true"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
          </button>
          {/* 语言切换器 */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3 py-1.5 text-xs tracking-[0.08em] text-frost/70 transition-all hover:border-accent/40 hover:text-frost"
              aria-label="Language"
            >
              <span className="text-[10px] text-accent/80">{currentLang.flag}</span>
              {currentLang.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(13,10,14,0.96)] py-1 backdrop-blur-2xl">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => pickLang(l.code)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs tracking-[0.1em] transition-colors hover:bg-white/[0.05] ${
                      lang === l.code ? 'text-accent' : 'text-frost/70'
                    }`}
                  >
                    <span className="w-5 text-[10px] text-accent/70">{l.flag}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => go('/login')}
            className="btn-text px-4 py-2 text-sm"
          >
            {t('nav.login')}
          </button>
          <button
            onClick={() => go('/register')}
            className="btn-rose btn-rose--sm"
          >
            {t('nav.register')}
          </button>
        </div>

        {/* 移动端菜单按钮 */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex h-10 w-10 items-center justify-center md:hidden"
          aria-label="Menu"
        >
          <span className={`absolute h-px w-5 bg-frost/80 transition-transform ${menuOpen ? 'rotate-45' : '-translate-y-[5px]'}`} />
          <span className={`absolute h-px w-5 bg-frost/80 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`absolute h-px w-5 bg-frost/80 transition-transform ${menuOpen ? '-rotate-45' : 'translate-y-[5px]'}`} />
        </button>
      </nav>

      {/* 移动端下拉 */}
      {menuOpen && (
        <div className="border-b border-white/[0.06] bg-[rgba(9,8,10,0.96)] px-6 py-5 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-1">
            {/* 移动端语言切换 */}
            <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-3">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => pickLang(l.code)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs tracking-[0.1em] transition-colors ${
                    lang === l.code
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-white/[0.08] text-frost/60 hover:text-frost'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-4">
              <button onClick={() => go('/')} className="btn-ghost flex-1 py-2.5 text-sm">
                {t('nav.home')}
              </button>
              <button onClick={() => go('/login')} className="btn-ghost flex-1 py-2.5 text-sm">
                {t('nav.login')}
              </button>
              <button onClick={() => go('/register')} className="btn-rose btn-rose--sm flex-1">
                {t('nav.register')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
