'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * 顶部背景全幅翻页轮播 — CSS transform 像素级整页切换
 *
 * - 3 个页面，每张图片铺满整个背景区域（object-cover）
 * - 用 transform: translateX(px) 做整页滑动
 * - 支持鼠标拖拽、触屏左右滑动
 * - 松手自动吸附到最近整页
 * - 左右箭头按钮翻页
 * - 无自动播放
 */
const IMAGES = [
  { src: '/images/月亮.webp', alt: '月亮' },
  { src: '/images/命运之轮.webp', alt: '命运之轮' },
  { src: '/images/太阳.webp', alt: '太阳' },
];

export default function TopSwipeBand() {
  const [current, setCurrent] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; active: boolean } | null>(null);
  const isAnimating = useRef(false);

  // 测量容器宽度
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setPageWidth(el.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // 整页切换
  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, IMAGES.length - 1));
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrent(clamped);
    setDragX(0);
    window.setTimeout(() => { isAnimating.current = false; }, 450);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (isAnimating.current) return;
    dragState.current = { startX: e.clientX, active: true };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragState.current?.active) return;
    const dx = e.clientX - dragState.current.startX;
    setDragX(dx);
  };

  const onUp = () => {
    if (!dragState.current) return;
    const width = pageWidth || 1;
    const ratio = dragX / width;

    let target = current;
    if (ratio < -0.2) {
      target = Math.min(current + 1, IMAGES.length - 1);
    } else if (ratio > 0.2) {
      target = Math.max(current - 1, 0);
    }
    dragState.current = null;
    setIsDragging(false);
    setDragX(0);
    goTo(target);
  };

  // 用像素计算偏移：当前页 * 页宽 + 拖拽偏移
  const offsetPx = -(current * pageWidth) + dragX;

  return (
    <>
      <div
        ref={containerRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`h-full w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="flex h-full"
          style={{
            width: `${IMAGES.length * 100}%`,
            transform: `translateX(${offsetPx}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {IMAGES.map((img, i) => (
            <div
              key={i}
              className="relative h-full shrink-0 overflow-hidden"
              style={{ width: `${100 / IMAGES.length}%` }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="h-full w-full object-cover saturate-[0.72] brightness-[0.85]"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 左右箭头 */}
      <button
        onClick={() => goTo(current - 1)}
        disabled={current === 0}
        className="pointer-events-auto absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl text-white/80 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white disabled:opacity-20"
        aria-label="上一张"
      >
        ‹
      </button>
      <button
        onClick={() => goTo(current + 1)}
        disabled={current === IMAGES.length - 1}
        className="pointer-events-auto absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl text-white/80 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white disabled:opacity-20"
        aria-label="下一张"
      >
        ›
      </button>

      {/* 指示点 */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {IMAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-accent' : 'w-1.5 bg-white/30'
            }`}
          />
        ))}
      </div>
    </>
  );
}
