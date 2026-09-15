'use client';

import { useEffect, useRef } from 'react';

export default function StarsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Array<{x: number; y: number; r: number; alpha: number; da: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      canvas.width = document.documentElement.clientWidth || window.innerWidth;
      canvas.height = document.documentElement.clientHeight || window.innerHeight;
    };

    const initStars = () => {
      const count = Math.floor((canvas.width * canvas.height) / 4000);
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random(),
        da: (Math.random() - 0.5) * 0.01
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      starsRef.current.forEach(s => {
        s.alpha += s.da;
        if (s.alpha <= 0.1 || s.alpha >= 1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.6})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      initStars();
    };

    resize();
    initStars();
    draw();

    window.addEventListener('resize', onResize);

    // 卸载时必须停掉 RAF 并摘掉同一个函数引用，否则动画循环会继续跑、
    // 反复挂载还会叠加出多个循环（原实现 removeEventListener 传的是另一个空函数，永远摘不掉）
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="stars-canvas"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
