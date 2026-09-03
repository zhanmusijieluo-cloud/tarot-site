'use client';

import { useEffect, useRef } from 'react';

/**
 * CardDissolve — 全屏牌面尘埃消散
 *
 * 覆盖整个弹层视口。先在牌的原屏幕位置画出整张牌，随后：
 *  1) 牌本体自身从外到内渐隐（卡片轮廓先软化消失）
 *  2) 牌面被采样成彩色像素粒子，以屏幕坐标从牌面中心向四周飘散，
 *     可飞出牌边界、飞出屏幕，无裁切
 * 动画结束回调 onDone，由父组件真正关闭弹层。
 */

interface Props {
  src: string;
  /** 指向牌显示容器的 ref，用于在弹层内定位牌的真实屏幕位置和尺寸 */
  cardBoxRef: React.RefObject<HTMLDivElement | null>;
  /** 粒子动画就绪（图片加载完、canvas 初始化完成）时调用；父组件此时才隐藏牌面 img，避免回闪 */
  onReady?: () => void;
  onDone: () => void;
}

const DUR = 1400; // 总时长 ms
const TARGET = 2000; // 目标粒子数

export default function CardDissolve({ src, cardBoxRef, onReady, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const box = cardBoxRef.current;

    let raf = 0;
    let disposed = false;

    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // canvas 铺满其父级弹层（CSS 像素），×dpr 保证清晰
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 牌在 canvas 局部坐标中的矩形
      const cRect = canvas.getBoundingClientRect();
      const bRect = box ? box.getBoundingClientRect() : { left: cw / 2 - 120, top: ch / 2 - 201, width: 240, height: 402 };
      const rx = bRect.left - cRect.left;
      const ry = bRect.top - cRect.top;
      const rw = bRect.width;
      const rh = bRect.height;

      // 用与显示一致的牌尺寸离屏绘制，便于精确采样。
      // 关键：img 在弹层里是 object-cover（按比例裁切居中），这里必须模拟同样的
      // cover 语义，否则采样出来的是拉伸后的整图，粒子消散时牌面会轻微变形/放大。
      const off = document.createElement('canvas');
      off.width = Math.max(2, Math.round(rw));
      off.height = Math.max(2, Math.round(rh));
      const octx = off.getContext('2d');
      if (!octx) return;
      const iw = img.naturalWidth || 1;
      const ih = img.naturalHeight || 1;
      const coverScale = Math.max(off.width / iw, off.height / ih);
      const sw = off.width / coverScale; // 原图上的可视宽度
      const sh = off.height / coverScale; // 原图上的可视高度
      const sx = (iw - sw) / 2; // 原图水平居中裁剪起点
      const sy = (ih - sh) / 2; // 原图垂直居中裁剪起点
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
      const data = octx.getImageData(0, 0, off.width, off.height).data;

      // 采样成粒子：完全随机散布（先收集有效像素，再随机抽取），无网格痕迹
      type Pixel = { x: number; y: number; r: number; g: number; b: number };
      const candidates: Pixel[] = [];
      // 按 2px 步长收集所有不透明像素
      for (let y = 0; y < off.height; y += 2) {
        for (let x = 0; x < off.width; x += 2) {
          const i = (y * off.width + x) * 4;
          if (data[i + 3] <= 30) continue;
          candidates.push({ x, y, r: data[i], g: data[i + 1], b: data[i + 2] });
        }
      }
      // Fisher-Yates 洗牌后取前 TARGET 个，粒子位置完全随机
      for (let k = candidates.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        const tmp = candidates[k];
        candidates[k] = candidates[j];
        candidates[j] = tmp;
      }
      const picked = candidates.slice(0, Math.min(TARGET, candidates.length));

      type P = { x: number; y: number; vx: number; vy: number; size: number; maxLife: number; rot: number; vr: number; color: string; delay: number; baseVx: number };
      const particles: P[] = [];
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;
      const maxDist = Math.hypot(rw / 2, rh / 2);
      for (const px0 of picked) {
        // 屏幕坐标：随机位置 + 小半径随机微移，彻底无网格
        const px = rx + px0.x + (Math.random() - 0.5) * 4;
        const py = ry + px0.y + (Math.random() - 0.5) * 4;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy) || 1;
        // 烟雾袅升：主方向向上，但每个粒子速度/朝向高度随机
        const spread = 8 + 34 * (dist / maxDist) + Math.random() * 40;
        const jitter = (Math.random() - 0.5) * 3.0; // 大幅度方向抖动，去同步感
        const ang = Math.atan2(dy, dx) + jitter;
        const rise = 36 + Math.random() * 90; // 向上飘升力度（个体差异大）
        particles.push({
          x: px,
          y: py,
          vx: Math.cos(ang) * spread,
          vy: Math.sin(ang) * spread - rise, // 净向上
          baseVx: (Math.random() - 0.5) * 26, // 每个粒子的基础水平漂移
          size: 0.6 + Math.random() * 2.2,
          maxLife: 0.9 + Math.random() * 1.5, // 寿命差异大 → 前后错落
          rot: 0,
          vr: (Math.random() - 0.5) * 4.0,
          color: `rgb(${px0.r},${px0.g},${px0.b})`,
          delay: Math.random() * 0.65, // 出发时间差异大 → 层次错落
        });
      }

      const start = performance.now();
      let last = start;
      // 就绪：canvas 已配置、粒子已生成，通知父组件隐藏牌面 img（无缝衔接，无回闪）
      readyRef.current?.();
      const frame = (now: number) => {
        if (disposed) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const t = now - start;

        ctx.clearRect(0, 0, cw, ch);

        // 牌本体不再由 canvas 重画（避免与下方 img 叠加导致闪变/放大感），
        // 由父组件用 CSS opacity 让 img 平滑淡出，canvas 只负责粒子接力。

        // 烟雾袅升：圆形粒子 + 水平摇曳 + 柔和淡入淡出
        const prog = Math.pow(Math.max(0, 1 - t / DUR), 0.8);
        for (const p of particles) {
          // 出发前：粒子待机在原位（不显示），错落出发
          const wait = t - p.delay * 1000;
          if (wait <= 0) continue;
          const local = wait / (p.maxLife * 1000);
          if (local >= 1) continue;
          // 柔和淡入（前 12% 渐显）+ 柔和淡出（后 30% 渐隐），两端都软
          const fadeIn = Math.min(1, local / 0.12);
          const fadeOut = local > 0.7 ? (1 - local) / 0.3 : 1;
          const vis = fadeIn * fadeOut;
          if (vis <= 0.01) continue;
          // 运动：净上升 + 每帧水平摇曳（布朗运动），打破整齐
          p.vy -= 22 * dt;
          p.vx += (Math.random() - 0.5) * 30 * dt + (p.baseVx - p.vx) * 0.02;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          // 双层光晕圆：外圈柔光 + 内圈实心，边缘柔和无方块感
          ctx.globalAlpha = prog * vis * 0.22;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = prog * vis * 0.92;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (t >= DUR) {
          doneRef.current();
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    img.onerror = () => doneRef.current();
    img.src = src;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [src, cardBoxRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
