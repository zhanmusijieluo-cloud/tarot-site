'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hueShift: boolean;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function Starfield({ count = 220 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = document.documentElement.clientWidth || window.innerWidth;
    let h = document.documentElement.clientHeight || window.innerHeight;
    let paletteA = '138,130,212';
    let paletteB = '240,238,255';

    const readTheme = () => {
      paletteA = hexToRgb(cssVar('--particle-a', '#8a82d4')).join(',');
      paletteB = hexToRgb(cssVar('--particle-b', '#f0eeff')).join(',');
    };
    readTheme();
    // 主题切换时刷新调色板
    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = document.documentElement.clientWidth || window.innerWidth;
      h = document.documentElement.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 2 + 0.5,
        size: Math.random() * 1.5 + 0.45,
        speed: Math.random() * 0.15 + 0.02,
        opacity: Math.random() * 0.45 + 0.4,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        hueShift: Math.random() < 0.3,
      });
    }
    // 流星：低频随机生成，斜向划过
    const meteors: Meteor[] = [];
    let nextMeteorAt = performance.now() + 2500 + Math.random() * 4000;

    const spawnMeteor = () => {
      const fromTop = Math.random() < 0.7;
      meteors.push({
        x: Math.random() * w * 0.9 + w * 0.05,
        y: fromTop ? -30 : Math.random() * h * 0.3,
        vx: -(2.6 + Math.random() * 2.4),
        vy: 1.6 + Math.random() * 1.4,
        life: 0,
        maxLife: 55 + Math.random() * 30,
        len: 90 + Math.random() * 70,
      });
    };

    // ⚠️ 帧率封顶 30fps + 后台不画 (2026-09-18 优化):
    //    这个 canvas 挂在根 layout 上, 每个页面都在跑。实测「完全静止」时
    //    主线程仍占 26~34% (关于页 29%、首页 34%、星盘页 30%), 且与有没有星盘无关 ——
    //    就是它。主线程被长期占住, React 的软导航/状态更新这些低优先级任务被挤到后面,
    //    表现就是「切盘/点按钮要等一下才反应」。
    //    星星漂移最快 0.375px/帧、闪烁是 sin 慢变, 30fps 肉眼无差别;
    //    所有增量都乘 dt 补偿, 动画速度与 60fps 时完全一致 (不是变慢, 只是少画几帧)。
    const FRAME_MS = 1000 / 30;
    let lastT = 0;
    let lineFrame = -1e9;
    let linePairs: number[] = [];

    const animate = (ts: number) => {
      rafRef.current = requestAnimationFrame(animate);

      // 切到别的标签/最小化: 一帧都不画 (回来时用 dt 一次性补上)
      if (document.hidden) { lastT = 0; return; }
      if (lastT && ts - lastT < FRAME_MS - 1) return;
      const dt = lastT ? Math.min(3, (ts - lastT) / 16.667) : 1;
      lastT = ts;

      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      if (now > nextMeteorAt) {
        spawnMeteor();
        if (Math.random() < 0.3) spawnMeteor(); // 偶发双流星
        nextMeteorAt = now + 3500 + Math.random() * 6000;
      }

      for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed * dt;
        const twinkle = 0.78 + 0.22 * Math.sin(s.twinklePhase);
        const alpha = s.opacity * twinkle;

        s.y -= s.speed * s.z * dt;
        if (s.y < -10) {
          s.y = h + 10;
          s.x = Math.random() * w;
        }

        const color = s.hueShift && s.z > 1.8 ? paletteA : paletteB;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.z * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();

        // 少量大星带微光晕
        if (s.z > 2.2 && s.size > 1.2) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
          g.addColorStop(0, `rgba(${paletteA}, ${alpha * 0.5})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(s.x - s.size * 4, s.y - s.size * 4, s.size * 8, s.size * 8);
        }
      }

      // 流星：拖尾渐隐
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life += dt;
        const t = m.life / m.maxLife;
        const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        const alpha = Math.max(0, fade) * 0.85;
        if (m.life >= m.maxLife || m.x < -m.len || m.y > h + m.len) {
          meteors.splice(i, 1);
          continue;
        }
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        const tx = m.x - (m.vx / speed) * m.len;
        const ty = m.y - (m.vy / speed) * m.len;
        const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(235, 240, 255, ${alpha})`);
        grad.addColorStop(0.25, `rgba(${paletteB}, ${alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // 流星头部亮点
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      // 近距离微弱连线
      //  ① 降采样到每 3 颗星 (视觉几乎无差别, 比较次数降为 1/9)
      //  ② 星点每帧只挪 <1px, 候选对 100ms 重算一次就够 —— 不必每帧做 O(n²)
      //  ③ 所有线合并进同一条 path, 一次 stroke() —— 原本每条线一次 beginPath/stroke,
      //     是这块最贵的部分 (canvas 状态切换 + 独立光栅化)
      //  ④ 距离用平方比较, 省掉 sqrt
      if (ts - lineFrame > 100) {
        lineFrame = ts;
        linePairs = [];
        for (let i = 0; i < stars.length; i += 3) {
          for (let j = i + 3; j < stars.length; j += 3) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            if (dx > 80 || dx < -80 || dy > 80 || dy < -80) continue;
            if (dx * dx + dy * dy < 6400) { linePairs.push(i, j); }
          }
        }
      }
      if (linePairs.length) {
        ctx.strokeStyle = `rgba(${paletteA}, 0.07)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let k = 0; k < linePairs.length; k += 2) {
          const a = stars[linePairs[k]], b = stars[linePairs[k + 1]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
    };
  }, [count]);

  return <canvas ref={canvasRef} className="starfield-bg" aria-hidden="true" />;
}
