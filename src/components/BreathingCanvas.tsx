'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  angle: number;
  dist: number;
  baseDist: number;
  size: number;
  speed: number;
  opacity: number;
}

type Phase = 'inhale' | 'hold' | 'exhale';

export default function BreathingCanvas({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [started, setStarted] = useState(false);

  const PHASES: Record<Phase, { duration: number; label: string; sub: string }> = {
    inhale: { duration: 4000, label: '吸气', sub: '慢慢吸气，感受空气进入身体' },
    hold: { duration: 7000, label: '屏息', sub: '保持片刻，让宁静沉淀' },
    exhale: { duration: 8000, label: '呼气', sub: '缓缓呼气，释放所有杂念' },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.parentElement?.clientWidth || window.innerWidth;
      h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 600;

    const hexToRgb = (hex: string): string => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      const n = parseInt(full, 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    };
    const readVar = (name: string, fallback: string): string => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    let colA = '155,140,255';
    let colB = '240,238,255';
    const readTheme = () => {
      colA = hexToRgb(readVar('--accent', '#9b8cff'));
      colB = hexToRgb(readVar('--particle-b', '#f0eeff'));
    };
    readTheme();
    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 180 + 20;
      particles.push({
        angle,
        dist,
        baseDist: dist,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }
    particlesRef.current = particles;

    let startTime = performance.now();
    let currentPhase: Phase = 'inhale';
    let phaseStart = startTime;

    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Determine phase progress
      const elapsed = time - phaseStart;
      const duration = PHASES[currentPhase].duration;
      let progress = Math.min(elapsed / duration, 1);

      // Advance phase
      if (progress >= 1) {
        const order: Phase[] = ['inhale', 'hold', 'exhale'];
        const idx = order.indexOf(currentPhase);
        currentPhase = order[(idx + 1) % order.length];
        phaseStart = time;
        progress = 0;
        setPhase(currentPhase);
      }
      setPhaseTime(progress);

      // Breathing scale factor
      let breatheScale = 1;
      if (currentPhase === 'inhale') {
        breatheScale = 1 + progress * 0.4; // expand to 1.4x
      } else if (currentPhase === 'hold') {
        breatheScale = 1.4;
      } else {
        breatheScale = 1.4 - progress * 0.4; // contract back to 1x
      }

      for (const p of particles) {
        p.angle += p.speed * 0.003;
        const d = p.baseDist * breatheScale;
        const x = cx + Math.cos(p.angle) * d;
        const y = cy + Math.sin(p.angle) * d * 0.6; // slight ellipse

        const alpha = p.opacity * (0.5 + 0.5 * breatheScale / 1.4);
        const near = p.baseDist < 90;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${near ? colA : colB}, ${alpha})`;
        ctx.fill();
      }

      // Central glow
      const glowR = 60 * breatheScale;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grad.addColorStop(0, `rgba(${colA},${0.1 * breatheScale})`);
      grad.addColorStop(1, `rgba(${colA},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      rafRef.current = requestAnimationFrame(animate);
    };

    if (started) {
      startTime = performance.now();
      phaseStart = startTime;
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
    };
  }, [started]);

  const handleStart = () => setStarted(true);
  const handleSkip = () => onComplete?.();

  return (
    <div className="breathing-canvas-host">
      <canvas ref={canvasRef} />
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-4">
        <div className="label-en mb-2">CENTERING</div>
        <div className="text-center">
          <div className="text-[clamp(2.5rem,6vw,4rem)] text-frost/90 tracking-[0.3em] mb-3 transition-all duration-1000"
               style={{ opacity: started ? 1 : 0.6, transform: started ? 'scale(1)' : 'scale(0.95)' }}>
            {started ? PHASES[phase].label : '呼吸'}
          </div>
          <p className="text-muted text-sm tracking-wider max-w-xs mx-auto">
            {started ? PHASES[phase].sub : '放慢呼吸，放松身心，以更好的状态感知牌意。'}
          </p>
        </div>

        {!started ? (
          <div className="flex gap-3 mt-4">
            <button onClick={handleStart} className="glass-btn-primary">开始</button>
            <button onClick={handleSkip} className="glass-btn">跳过呼吸</button>
          </div>
        ) : (
          <div className="flex gap-3 mt-4">
            <button onClick={handleSkip} className="glass-btn text-xs">跳过呼吸</button>
          </div>
        )}

        {started && (
          <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-accent/60 transition-all duration-100 ease-linear"
              style={{ width: `${phaseTime * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
