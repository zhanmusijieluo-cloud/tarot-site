'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * RoseDust —— 黑粉魔法星尘背景
 * 纯黑底 + 雾粉粒子缓慢上浮 + 闪烁 + 偶发粉色流光
 */
export default function RoseDust({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface Dust {
      x: number;
      y: number;
      r: number;
      speed: number;
      drift: number;
      phase: number;
      alpha: number;
      rose: boolean;
    }
    let dust: Dust[] = [];

    const rose = [217, 168, 184];
    const pale = [240, 229, 234];

    const resize = () => {
      w = document.documentElement.clientWidth || window.innerWidth;
      h = document.documentElement.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.min(150, Math.floor((w * h) / 14000));
      dust = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 0.25 + 0.08,
        drift: Math.random() * 0.15 - 0.075,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.2,
        rose: Math.random() < 0.6,
      }));
    };

    const frame = (t: number) => {
      const time = t / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const p of dust) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(time * 0.5 + p.phase) * 0.08;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;

        const twinkle = 0.55 + 0.45 * Math.sin(time * (1 + p.r) + p.phase);
        const alpha = p.alpha * twinkle;
        const c = p.rose ? rose : pale;

        /* 微光晕 */
        if (p.r > 1.4) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.22})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
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
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true" />;
}
