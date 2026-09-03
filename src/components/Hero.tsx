'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import RoseDust from '@/components/RoseDust';
import { useI18n } from '@/i18n';

// 3D 卡环仅在客户端加载（WebGL 依赖浏览器环境），立即渲染
const HeroCardRing = dynamic(() => import('@/components/HeroCardRing'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="text-xs tracking-[0.4em] text-frost/40">✦</span>
    </div>
  ),
});

export default function Hero() {
  const router = useRouter();
  const { t } = useI18n();
  // 弹层打开时隐藏内容文字，关闭后恢复
  const [cardActive, setCardActive] = useState(false);
  const handleCardActive = useCallback((active: boolean) => setCardActive(active), []);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{
        // row 1: 4.5rem（导航高度占位）
        // row 2: 1fr（首屏主体）
        display: 'grid',
        gridTemplateRows: '4.5rem 1fr',
        minHeight: 'min(100vh, 46rem)',
      }}
    >
      <div aria-hidden="true" />

      <div className="relative overflow-hidden">
        {/* 氛围光晕——低饱和雾粉 */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(217,168,184,0.10),transparent_60%)]"
          aria-hidden="true"
        />
        <RoseDust />

        {/* 3D 卡环层 — 大阿卡那 22 张牌环绕旋转 */}
        <div className="absolute inset-0 z-[1]">
          <HeroCardRing onActiveChange={handleCardActive} />
        </div>

        {/* 可读性遮罩：垂直压暗 + 中央晕影 + 轻微冷粉色调，压住图片中的金黄 */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_bottom,rgba(8,7,9,0.66)_0%,rgba(8,7,9,0.46)_45%,rgba(10,8,11,0.97)_100%),radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(8,7,9,0.36),transparent_70%)]"
          aria-hidden="true"
        />
        {/* 冷粉叠色：对背景图降饱和、转冷，消除金黄色 */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] mix-blend-color bg-[rgba(150,120,135,0.35)]"
          aria-hidden="true"
        />

        {/* 内容层 —— 弹层打开时淡出隐藏，关闭后恢复 */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-700 ${cardActive ? 'opacity-0' : 'opacity-100'}`}
        >
          <p className="rise rise-1 mb-8 text-[0.7rem] tracking-[0.45em] text-accent/80 uppercase sm:text-xs">
            {t('hero.label')}
          </p>

          <h1 className="rise rise-2 font-display text-[clamp(2.6rem,6vw,5.5rem)] leading-[1.15] font-semibold tracking-[0.08em] text-frost">
            {t('hero.line1')}
            <span className="mt-3 block font-display-italic text-[clamp(2.6rem,6vw,5.5rem)] leading-[1.15] font-semibold tracking-[0.04em] text-accent">
              {t('hero.line2')}
            </span>
          </h1>

          <p className="rise rise-3 mx-auto mt-7 max-w-xl text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed text-frost/60">
            {t('hero.desc')}
          </p>

          <div className="rise rise-4 mt-11 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <button
              onClick={() => router.push('/online?spread=daily')}
              className="btn-rose pointer-events-auto w-full max-w-xs sm:w-auto"
            >
              {t('hero.cta')}
              <span aria-hidden="true">→</span>
            </button>
            <button
              onClick={() => document.querySelector('#core-features')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-text pointer-events-auto w-full max-w-xs justify-center sm:w-auto"
            >
              {t('hero.explore')}
            </button>
          </div>
        </div>
      </div>

      {/* 底部渐隐融入正文：加长渐隐高度（h-44≈176px）并做多段平滑，避免 3D 卡环被硬切 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-44 bg-gradient-to-b from-transparent via-[rgba(8,7,9,0.55)] to-void"
        aria-hidden="true"
      />
    </section>
  );
}
