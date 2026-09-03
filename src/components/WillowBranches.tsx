'use client';

import { useEffect, useRef } from 'react';

interface Branch {
  baseX: number;
  baseY: number;
  angle: number;
  length: number;
  segments: number;
  swayPhase: number;
  swaySpeed: number;
  thickness: number;
  leaves: Leaf[];
}

interface Leaf {
  t: number;
  offsetAngle: number;
  length: number;
  width: number;
  swayOffset: number;
  color: string;
  alpha: number;
}

export default function WillowBranches() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const c = canvas;
    const cx = ctx;

    let animationId: number;
    let time = 0;
    const branches: Branch[] = [];

    const GREENS = [
      '#4ade80', '#22c55e', '#16a34a', '#15803d',
      '#86efac', '#4ade80', '#34d399', '#6ee7b7',
    ];

    function randomGreen() {
      return GREENS[Math.floor(Math.random() * GREENS.length)];
    }

    function initBranches() {
      branches.length = 0;
      const w = c.width;
      const h = c.height;

      // 7 willow branches from top, concentrated around center where "塔罗" sits
      const configs = [
        { xRatio: 0.15, angle: Math.PI / 2 + 0.15, len: h * 0.55 },
        { xRatio: 0.28, angle: Math.PI / 2 + 0.08, len: h * 0.62 },
        { xRatio: 0.42, angle: Math.PI / 2 - 0.05, len: h * 0.70 },   // center-left, longest
        { xRatio: 0.55, angle: Math.PI / 2 - 0.10, len: h * 0.75 },   // center, longest
        { xRatio: 0.68, angle: Math.PI / 2 - 0.08, len: h * 0.68 },
        { xRatio: 0.80, angle: Math.PI / 2 + 0.05, len: h * 0.58 },
        { xRatio: 0.90, angle: Math.PI / 2 + 0.12, len: h * 0.50 },
      ];

      for (const cfg of configs) {
        const baseX = w * cfg.xRatio;
        const baseY = -10;
        const angle = cfg.angle;
        const length = cfg.len;
        const segments = 40 + Math.floor(Math.random() * 20);
        const thickness = 2.5 + Math.random() * 1.5;

        const leaves: Leaf[] = [];
        const leafCount = 18 + Math.floor(Math.random() * 12);
        for (let i = 0; i < leafCount; i++) {
          leaves.push({
            t: 0.15 + Math.random() * 0.82,
            offsetAngle: (Math.random() - 0.5) * 0.9,
            length: 18 + Math.random() * 30,
            width: 2.5 + Math.random() * 2,
            swayOffset: Math.random() * Math.PI * 2,
            color: randomGreen(),
            alpha: 0.5 + Math.random() * 0.45,
          });
        }

        branches.push({
          baseX,
          baseY,
          angle,
          length,
          segments,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.4 + Math.random() * 0.5,
          thickness,
          leaves,
        });
      }
    }

    function getBranchPoint(
      branch: Branch,
      t: number,
      currentTime: number
    ): { x: number; y: number; angle: number } {
      const sway = Math.sin(currentTime * branch.swaySpeed + branch.swayPhase) * 18 * t;
      const sway2 = Math.sin(currentTime * branch.swaySpeed * 0.7 + branch.swayPhase + 1.3) * 8 * t;

      const totalSway = sway + sway2;
      const effectiveAngle = branch.angle + (totalSway / branch.length) * 0.6;

      const x = branch.baseX + Math.cos(effectiveAngle) * branch.length * t;
      const y = branch.baseY + Math.sin(effectiveAngle) * branch.length * t;

      // Tangent angle at this point
      const dt = 0.01;
      const swayDx = Math.sin((currentTime * branch.swaySpeed + branch.swayPhase) * (t + dt)) * 18 * (t + dt)
        + Math.sin((currentTime * branch.swaySpeed * 0.7 + branch.swayPhase + 1.3) * (t + dt)) * 8 * (t + dt);
      const effectiveAngleDx = effectiveAngle + ((swayDx - totalSway) / branch.length) * 0.6;
      const tx = branch.baseX + Math.cos(effectiveAngleDx) * branch.length * (t + dt);
      const ty = branch.baseY + Math.sin(effectiveAngleDx) * branch.length * (t + dt);
      const tangentAngle = Math.atan2(ty - y, tx - x);

      return { x, y, angle: tangentAngle };
    }

    function drawBranch(branch: Branch, currentTime: number) {
      const { segments } = branch;

      // Draw main stem
      cx.beginPath();
      cx.moveTo(branch.baseX, branch.baseY);

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const p = getBranchPoint(branch, t, currentTime);
        if (i === 1) cx.moveTo(p.x, p.y);
        else cx.lineTo(p.x, p.y);
      }

      const grad = cx.createLinearGradient(
        branch.baseX, branch.baseY,
        branch.baseX, branch.baseY + branch.length
      );
      grad.addColorStop(0, 'rgba(74, 222, 128, 0.7)');
      grad.addColorStop(0.3, 'rgba(34, 197, 94, 0.55)');
      grad.addColorStop(0.7, 'rgba(22, 163, 74, 0.4)');
      grad.addColorStop(1, 'rgba(21, 128, 61, 0.15)');

      cx.strokeStyle = grad;
      cx.lineWidth = branch.thickness;
      cx.lineCap = 'round';
      cx.stroke();

      // Draw leaves along the branch
      for (const leaf of branch.leaves) {
        const pt = getBranchPoint(branch, leaf.t, currentTime);
        const leafSway = Math.sin(
          currentTime * branch.swaySpeed * 1.3 + leaf.swayOffset
        ) * 6;

        const leafAngle = pt.angle + Math.PI / 2 + leaf.offsetAngle + (leafSway / 30);
        const leafEndX = pt.x + Math.cos(leafAngle) * leaf.length;
        const leafEndY = pt.y + Math.sin(leafAngle) * leaf.length;

        // Leaf shape - elongated teardrop
        const perpAngle = leafAngle + Math.PI / 2;
        const lw = leaf.width;
        const cp1x = pt.x + Math.cos(leafAngle + 0.3) * leaf.length * 0.5 + Math.cos(perpAngle) * lw * 0.5;
        const cp1y = pt.y + Math.sin(leafAngle + 0.3) * leaf.length * 0.5 + Math.sin(perpAngle) * lw * 0.5;
        const cp2x = pt.x + Math.cos(leafAngle - 0.3) * leaf.length * 0.5 - Math.cos(perpAngle) * lw * 0.5;
        const cp2y = pt.y + Math.sin(leafAngle - 0.3) * leaf.length * 0.5 - Math.sin(perpAngle) * lw * 0.5;

        cx.beginPath();
        cx.moveTo(pt.x, pt.y);
        cx.quadraticCurveTo(cp1x, cp1y, leafEndX, leafEndY);
        cx.quadraticCurveTo(cp2x, cp2y, pt.x, pt.y);

        const leafGrad = cx.createLinearGradient(pt.x, pt.y, leafEndX, leafEndY);
        leafGrad.addColorStop(0, leaf.color === '#86efac'
          ? `rgba(134, 239, 172, ${leaf.alpha * 0.9})`
          : `rgba(74, 222, 128, ${leaf.alpha * 0.9})`);
        leafGrad.addColorStop(1, `rgba(21, 128, 61, ${leaf.alpha * 0.3})`);
        cx.fillStyle = leafGrad;
        cx.fill();
      }
    }

    const resize = () => {
      c.width = document.documentElement.clientWidth || window.innerWidth;
      c.height = document.documentElement.clientHeight || window.innerHeight;
      initBranches();
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      time += 0.016;
      cx.clearRect(0, 0, c.width, c.height);

      // Subtle glow behind branches
      for (const branch of branches) {
        const midT = 0.5;
        const midP = getBranchPoint(branch, midT, time);
        const glowGrad = cx.createRadialGradient(midP.x, midP.y, 0, midP.x, midP.y, 80);
        glowGrad.addColorStop(0, 'rgba(74, 222, 128, 0.04)');
        glowGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
        cx.fillStyle = glowGrad;
        cx.fillRect(midP.x - 80, midP.y - 80, 160, 160);
      }

      for (const branch of branches) {
        drawBranch(branch, time);
      }

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
