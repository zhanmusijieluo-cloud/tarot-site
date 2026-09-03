'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Navbar from '@/components/Navbar';

/** 滚动显现 */
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
      className={`w-full ${className}`}
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
    <Reveal className="mb-12 sm:mb-16">
      <div className="flex min-w-0 flex-wrap items-baseline gap-3 sm:gap-6">
        <span className="font-display text-xs tracking-[0.3em] text-accent/70 sm:text-sm">
          {no}
        </span>
        <h2 className="font-display min-w-0 break-words text-2xl font-light tracking-[0.1em] text-frost sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        <span className="hairline-glow hidden flex-1 sm:block" />
      </div>
      {sub && (
        <p className="mt-4 pl-9 text-sm leading-relaxed text-muted sm:pl-10 sm:text-base">
          {sub}
        </p>
      )}
    </Reveal>
  );
}

/** 子页面骨架：桌面优先 · 大气居中 · 与首页同款导航 */
export default function PageShell({
  label,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  compact = false,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="relative min-h-[56.25rem] w-full">
      <Navbar />

      {/* Hero — 大留白居中（compact 模式下隐藏，内容直接顶上来） */}
      {!compact && (
        <section className="relative overflow-hidden px-5 pt-[max(9rem,calc(env(safe-area-inset-top)+7rem))] pb-8">
          <div
            className="pointer-events-none absolute left-1/2 top-[-20%] h-[min(60vw,520px)] w-[min(60vw,520px)] -translate-x-1/2 rounded-full blur-[120px] opacity-40"
            style={{ background: 'var(--glow-primary)' }}
            aria-hidden="true"
          />
          <div className="relative mx-auto w-[92%] max-w-[106.25rem] text-center">
            <p className="mb-5 text-xs tracking-[0.35em] text-accent/75 uppercase sm:text-sm">
              {label}
            </p>
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,3.5rem)] font-extralight tracking-[0.08em] text-frost">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                {subtitle}
              </p>
            )}
            <div className="hairline-glow mx-auto mt-10 w-48" />
          </div>
        </section>
      )}

      {/* 内容 */}
      <main className={`relative ${
        compact ? 'pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))]' : ''
      } mx-auto w-[92%] max-w-[106.25rem] min-w-0 px-0 pb-28`}>
        {children}
      </main>

      {/* 页脚 */}
      {footer && (
        <footer className="relative px-5 pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="hairline-glow mx-auto mb-8 w-32" />
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}