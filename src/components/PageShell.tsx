'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/** 滚动显现：进入视口后上浮淡入 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(28px)',
        filter: shown ? 'blur(0)' : 'blur(5px)',
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter 0.9s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** 编号章节头：01 — 标题 — 副题 */
export function SectionHead({
  no,
  title,
  sub,
}: {
  no: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mb-10 sm:mb-14">
      <div className="flex items-baseline gap-4 sm:gap-6">
        <span className="font-display text-xs tracking-[0.3em] text-accent/70">
          {no}
        </span>
        <h2 className="font-display text-xl font-light tracking-[0.12em] text-frost sm:text-2xl md:text-[1.75rem]">
          {title}
        </h2>
        <span className="hairline-glow hidden flex-1 sm:block" />
      </div>
      {sub && (
        <p className="mt-3 pl-9 text-xs leading-relaxed text-muted sm:pl-10 sm:text-sm">
          {sub}
        </p>
      )}
    </Reveal>
  );
}

/** 编辑式页面骨架：返回导航 + Hero + 内容 + 页脚 */
export default function PageShell({
  label,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative min-h-[100dvh] w-full">
      {/* 顶部导航 */}
      <header className="fixed top-0 right-0 left-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav className="glass-panel mx-auto flex max-w-2xl items-center justify-between rounded-full px-4 py-2.5 lg:max-w-[64.75rem]">
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-2 py-1"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-3.5 w-3.5 text-muted transition-all duration-300 group-hover:-translate-x-0.5 group-hover:text-frost"
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            <span className="text-xs tracking-[0.18em] text-muted transition-colors group-hover:text-frost">
              返回首页
            </span>
          </button>
          <span className="font-display text-sm tracking-[0.18em] text-frost/90 uppercase">
            Oracle
          </span>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-[max(7.5rem,calc(env(safe-area-inset-top)+6rem))] pb-4">
        <div
          className="glow-breathe-slow pointer-events-none absolute left-1/2 top-[-30%] h-[min(70vw,560px)] w-[min(70vw,560px)] -translate-x-1/2 rounded-full blur-[120px] opacity-40"
          style={{ background: 'var(--glow-primary)' }}
          aria-hidden="true"
        />
        <div className={`relative mx-auto ${wide ? 'max-w-6xl' : 'max-w-4xl'} text-center`}>
          <p className="rise rise-1 mb-4 text-[10px] tracking-[0.42em] text-accent/75 uppercase">
            {label}
          </p>
          <h1 className="rise rise-2 font-display text-[1.75rem] font-extralight tracking-[0.08em] text-frost sm:text-[2.5rem] md:text-[3rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="rise rise-3 mx-auto mt-5 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
              {subtitle}
            </p>
          )}
          <div className="rise rise-4 hairline-glow mx-auto mt-8 w-40" />
        </div>
      </section>

      {/* 内容 */}
      <main className={`relative mx-auto w-full px-5 pb-24 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {children}
      </main>

      {/* 页脚 */}
      {footer && (
        <footer className="relative px-5 pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="hairline-glow mx-auto mb-8 w-24" />
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}
