'use client';

import { useEffect, useRef } from 'react';

/**
 * NebulaCanvas —— 程序化星云背景
 * 多层径向光晕缓慢漂移 + 微尘粒子，替代外部视频背景
 * 零外部依赖，canvas 绘制，性能可控
 */
export default function NebulaCanvas({
  className = '',
  density = 0.5,
}: {
  className?: string;
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* 三团缓慢漂移的星云光团 */
    const blobs = [
      { x: 0.72, y: 0.3, r: 0.5, hue: 258, sat: 70, light: 62, vx: 0.0006, vy: 0.0004 },
      { x: 0.22, y: 0.68, r: 0.42, hue: 210, sat: 55, light: 70, vx: -0.0005, vy: -0.00035 },
      { x: 0.5, y: 0.18, r: 0.36, hue: 300, sat: 45, light: 75, vx: 0.00035, vy: 0.0005 },
    ];

    /* 微尘粒子 */
    const stars: { x: number; y: number; r: number; tw: number; ph: number }[] = [];
    const starCount = Math.floor((density * 320 * width) / 1600 || 120);

    const resize = () => {
      width = document.documentElement.clientWidth || window.innerWidth;
      height = document.documentElement.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.length = 0;
      const n = Math.min(starCount, Math.floor((width * height) / 9000));
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.3 + 0.3,
          tw: Math.random() * 0.02 + 0.008,
          ph: Math.random() * Math.PI * 2,
        });
      }
    };

    const frame = (t: number) => {
      const time = t / 1000;
      ctx.clearRect(0, 0, width, height);

      /* 底色纯黑 */
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      /* 星云光团：径向渐变，缓慢漂移 */
      for (const b of blobs) {
        const bx = (b.x + Math.sin(time * 0.05 + b.vx * 1000) * 0.06) * width;
        const by = (b.y + Math.cos(time * 0.04 + b.vy * 1000) * 0.06) * height;
        const br = b.r * Math.max(width, height);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, 0.16)`);
        g.addColorStop(0.5, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, 0.05)`);
        g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      /* 微尘闪烁 */
      for (const s of stars) {
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.2 * s.tw * 60 + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 228, 255, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true" />;
}
