'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** 鼠标跟随光晕：柔和的月白辉光随指针游走 */
function CursorAura() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;
    let active = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!active) {
        active = true;
        el.classList.add('active');
      }
    };
    const onLeave = () => {
      active = false;
      el.classList.remove('active');
    };

    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-aura" aria-hidden="true" />;
}

const SYSTEMS = [
  {
    key: 'tarot',
    name: '塔罗',
    en: 'Tarot',
    route: '/online',
    desc: '心理象征、正逆位、经典塔罗牌阵，透视当下的潜意识。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-full w-full">
        <path d="M12 2l2.4 6.2L21 9l-5 4.3L17.5 21 12 17.4 6.5 21 8 13.3 3 9l6.6-.8z" />
      </svg>
    ),
  },
  {
    key: 'astrology',
    name: '星盘',
    en: 'Astro',
    route: '/astrology',
    desc: '行星落座与相位流转，解读性格底色与运势节奏。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-full w-full">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v18M3 12h18" />
      </svg>
    ),
  },
  {
    key: 'bazi',
    name: '八字',
    en: 'Bazi',
    route: '/bazi',
    desc: '天干地支、五行生克，看命局格局与大运起伏。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-full w-full">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 8.5h17M3.5 15.5h17M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
  },
  {
    key: 'ziwei',
    name: '紫微斗数',
    en: 'Ziwei',
    route: '/ziwei',
    desc: '十二宫主星布局，透视事业、感情、财富等人生领域。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-full w-full">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <path d="M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6" />
      </svg>
    ),
  },
  {
    key: 'lenormand',
    name: '雷诺曼',
    en: 'Lenormand',
    route: '/lenormand',
    desc: '36 张日常符号牌，意象直白、指向精准的即时指引。',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-full w-full">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M15.5 9.5A3.5 3.5 0 1110 6a2.8 2.8 0 005.5 3.5z" />
        <path d="M9 17.5l1.2-2.5 1.2 2.5M13 17.5l1.2-2.5 1.2 2.5" />
      </svg>
    ),
  },
];

const THEMES = [
  { key: 'astral-void', label: 'Astral' },
  { key: 'rose-mist', label: 'Rose' },
  { key: 'matcha-sanctuary', label: 'Matcha' },
  { key: 'solar-archive', label: 'Solar' },
];

/** 十二星座符号 · 银白光 */
const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

/** 银光旋转星盘 */
function SilverAstrolabe() {
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  const spokes = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* 最外围银光律动边框（与卡牌同款：旋转流动 + 月光闪烁） */}
      <div
        className="silver-rim silver-rim-outer rounded-full"
        style={{
          width: 'min(87.7vw, 591px)',
          height: 'min(87.7vw, 591px)',
          padding: '1.5px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 500 500"
        className="h-full w-full max-w-none"
        style={{ width: 'min(92vw, 620px)', height: 'min(92vw, 620px)' }}
        aria-hidden="true"
      >
        {/* 底部银光晕 */}
        <defs>
          <radialGradient id="silver-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--metal)" stopOpacity="0.14" />
            <stop offset="60%" stopColor="var(--metal)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--metal)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="250" cy="250" r="248" fill="url(#silver-core)" />

        {/* 外环 · 缓慢顺时针 */}
        <g className="origin-center animate-[spin_90s_linear_infinite]" style={{ transformOrigin: '250px 250px' }}>
          <circle cx="250" cy="250" r="238" fill="none" stroke="var(--metal)" strokeOpacity="0.22" strokeWidth="0.8" />
          <circle cx="250" cy="250" r="228" fill="none" stroke="var(--metal)" strokeOpacity="0.1" strokeWidth="0.6" />
          {ticks.map((i) => {
            const a = (i * 5 * Math.PI) / 180;
            const long = i % 6 === 0;
            const r1 = long ? 216 : 222;
            const r2 = 228;
            return (
              <line
                key={i}
                x1={250 + r1 * Math.cos(a)}
                y1={250 + r1 * Math.sin(a)}
                x2={250 + r2 * Math.cos(a)}
                y2={250 + r2 * Math.sin(a)}
                stroke="var(--metal)"
                strokeOpacity={long ? 0.45 : 0.2}
                strokeWidth={long ? 1 : 0.6}
              />
            );
          })}
          {/* 星座符号环 · 银白光 */}
          {ZODIAC.map((z, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180;
            return (
              <text
                key={z}
                x={250 + 196 * Math.cos(a)}
                y={250 + 196 * Math.sin(a)}
                fill="#e9efff"
                fontSize="19"
                fontFamily="'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Noto Serif SC', serif"
                textAnchor="middle"
                dominantBaseline="central"
                className="animate-[zodiac-glow_5s_ease-in-out_infinite]"
                style={{
                  animationDelay: `${i * 0.42}s`,
                  filter:
                    'drop-shadow(0 0 3px rgba(220, 232, 255, 0.95)) drop-shadow(0 0 9px rgba(200, 216, 255, 0.45))',
                }}
              >
                {z}
              </text>
            );
          })}
          <circle cx="250" cy="250" r="178" fill="none" stroke="var(--metal)" strokeOpacity="0.16" strokeWidth="0.7" />
        </g>

        {/* 中环 · 虚线逆时针 */}
        <g
          className="animate-[spin_60s_linear_infinite_reverse]"
          style={{ transformOrigin: '250px 250px' }}
        >
          <circle
            cx="250"
            cy="250"
            r="156"
            fill="none"
            stroke="var(--metal)"
            strokeOpacity="0.3"
            strokeWidth="0.9"
            strokeDasharray="2 10"
          />
          {spokes.map((i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={250 + 156 * Math.cos(a)}
                cy={250 + 156 * Math.sin(a)}
                r="2"
                fill="var(--metal)"
                fillOpacity="0.55"
              />
            );
          })}
        </g>

        {/* 内环 · 辐条顺时针 */}
        <g className="animate-[spin_36s_linear_infinite]" style={{ transformOrigin: '250px 250px' }}>
          <circle cx="250" cy="250" r="118" fill="none" stroke="var(--metal)" strokeOpacity="0.18" strokeWidth="0.7" />
          {spokes
            .filter((i) => i % 2 === 0)
            .map((i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={250 + 118 * Math.cos(a)}
                  y1={250 + 118 * Math.sin(a)}
                  x2={250 + 156 * Math.cos(a)}
                  y2={250 + 156 * Math.sin(a)}
                  stroke="var(--metal)"
                  strokeOpacity="0.14"
                  strokeWidth="0.6"
                />
              );
            })}
        </g>

        {/* 中心小星点 */}
        <g className="animate-[spin_24s_linear_infinite_reverse]" style={{ transformOrigin: '250px 250px' }}>
          {spokes.slice(0, 6).map((i) => {
            const a = (i * 60 * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={250 + 86 * Math.cos(a)}
                cy={250 + 86 * Math.sin(a)}
                r="1.4"
                fill="var(--accent)"
                fillOpacity="0.7"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/** 按钮内漂浮星点 */
function Sparkles() {
  const dots = [
    { l: '12%', t: '18%', d: '0s' },
    { l: '85%', t: '22%', d: '0.8s' },
    { l: '22%', t: '76%', d: '1.6s' },
    { l: '78%', t: '70%', d: '2.4s' },
    { l: '50%', t: '12%', d: '3.2s' },
    { l: '40%', t: '84%', d: '4s' },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute h-[2px] w-[2px] rounded-full bg-accent/70 blur-[0.5px] animate-[sparkle_4s_ease-in-out_infinite]"
          style={{ left: d.l, top: d.t, animationDelay: d.d }}
        />
      ))}
    </>
  );
}

/** 卡牌 3D 倾斜：随鼠标位置轻微俯仰 + 高光偏移 */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 12}deg) scale(1.035)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
  };

  return (
    <div
      ref={ref}
      className="tilt-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState('astral-void');
  const [system, setSystem] = useState('tarot');
  const [systemsOpen, setSystemsOpen] = useState(false);

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) setTheme(t);
  }, []);

  const applyTheme = (key: string) => {
    setTheme(key);
    document.documentElement.setAttribute('data-theme', key);
    try {
      localStorage.setItem('oracle-theme', key);
    } catch {
      /* ignore */
    }
  };

  const current = SYSTEMS.find((s) => s.key === system) ?? SYSTEMS[0];

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden">
      {/* 鼠标跟随光晕 */}
      <CursorAura />

      {/* ===== 顶部玻璃药丸导航 ===== */}
      <header className="fixed top-0 right-0 left-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav className="glass-panel mx-auto flex max-w-lg items-center justify-between rounded-full px-4 py-2.5 sm:max-w-2xl lg:max-w-[56.75rem] xl:max-w-[64.75rem]">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 py-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-display text-sm tracking-[0.18em] text-frost/90 uppercase lg:text-base">
              Oracle
            </span>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => router.push('/online')}
              className="px-3 py-1.5 text-xs tracking-wide text-frost transition-colors lg:px-4 lg:py-2 lg:text-sm"
            >
              入口
            </button>
            <button
              onClick={() => router.push('/online')}
              className="px-3 py-1.5 text-xs tracking-wide text-muted transition-colors hover:text-frost lg:px-4 lg:py-2 lg:text-sm"
            >
              呼吸
            </button>
            <button
              onClick={() => router.push('/learn')}
              className="px-3 py-1.5 text-xs tracking-wide text-muted transition-colors hover:text-frost lg:px-4 lg:py-2 lg:text-sm"
            >
              关于
            </button>
            <button
              onClick={() => router.push('/daily')}
              className="px-3 py-1.5 text-xs tracking-wide text-muted transition-colors hover:text-frost lg:px-4 lg:py-2 lg:text-sm"
            >
              记录
            </button>
          </div>
          <button
            onClick={() => router.push('/online')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] md:hidden"
            aria-label="菜单"
          >
            <span className="absolute h-px w-4 bg-frost/80" />
            <span className="absolute h-px w-2.5 bg-muted translate-y-1.5" />
          </button>
        </nav>
      </header>

      {/* ===== Hero ===== */}
      <main className="relative">
        <section className="relative flex min-h-[100dvh] items-center overflow-hidden px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] lg:pt-[max(5.5rem,calc(env(safe-area-inset-top)+3.5rem))]">
          {/* 背景光晕层（大范围渐变） */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/25 via-transparent to-void" />
            <div
              className="glow-breathe-slow pointer-events-none absolute left-1/2 top-[38%] h-[min(96vw,900px)] w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/4 rounded-full blur-[130px]"
              style={{ background: 'var(--glow-primary)' }}
            />
            <div
              className="glow-breathe-slow pointer-events-none absolute right-[-18%] bottom-[-10%] h-[min(80vw,720px)] w-[min(80vw,720px)] rounded-full blur-[130px] opacity-70 sm:right-[-10%]"
              style={{ background: 'var(--glow-secondary)' }}
            />
            <div
              className="glow-breathe-slow pointer-events-none absolute left-[-16%] top-[-12%] h-[min(70vw,620px)] w-[min(70vw,620px)] rounded-full blur-[120px] opacity-50"
              style={{ background: 'var(--glow-secondary)' }}
            />
            {/* 额外渐变一：中部偏右 · accent 青紫 */}
            <div
              className="glow-breathe-slow pointer-events-none absolute right-[8%] top-[12%] h-[min(52vw,460px)] w-[min(52vw,460px)] rounded-full blur-[110px] opacity-40"
              style={{ background: 'var(--accent)', animationDelay: '-6s' }}
            />
            {/* 额外渐变二：左下 · metal 银蓝 */}
            <div
              className="glow-breathe-slow pointer-events-none absolute left-[6%] bottom-[6%] h-[min(58vw,520px)] w-[min(58vw,520px)] rounded-full blur-[125px] opacity-35"
              style={{ background: 'var(--metal)', animationDelay: '-12s' }}
            />
          </div>
          <div
            className="hero-mist-glow pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 130% 95% at 50% 42%, var(--glow-secondary), transparent 72%)',
              opacity: 0.32,
            }}
          />

          {/* 双栏：左（文案 + 三个窗口） / 右（星盘 + 律动卡牌） */}
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 xl:gap-12">
            {/* ---- 左上：文案（错峰入场） ---- */}
            <div className="flex flex-col items-center text-center lg:items-start lg:pl-8 lg:text-left xl:pl-12">
              <p className="rise rise-1 mb-4 text-[10px] tracking-[0.42em] text-accent/75 uppercase">
                Digital Oracle
              </p>
              <h1 className="rise rise-2 font-display max-w-[18rem] text-[1.625rem] leading-[1.2] font-extralight tracking-tight text-frost/95 sm:max-w-xl sm:text-[2.75rem] md:text-[3.25rem]">
                在静默中
                <span className="title-shimmer">
                  遇见答案
                </span>
              </h1>
              <p className="rise rise-3 mt-4 max-w-md text-xs leading-relaxed text-muted sm:mt-6 sm:text-sm">
                <span className="inline-block tracking-wide">
                  Oracle —— 并非预测未来，而是重新理解当下。
                </span>
              </p>
            </div>

            {/* ---- 右侧：银光星盘 + 上下律动卡牌（3D 倾斜） ---- */}
            <div className="rise rise-2 relative order-2 flex items-center justify-center lg:order-none lg:row-span-2 lg:self-center">
              <div className="relative flex aspect-square w-[min(88vw,560px)] items-center justify-center lg:w-full lg:max-w-[560px]">
                <SilverAstrolabe />
                {/* 律动卡牌 */}
                <div className="relative animate-[float_6s_ease-in-out_infinite]">
                  <div
                    className="absolute -inset-16 -z-10 rounded-full opacity-60 blur-[110px] sm:-inset-24"
                    style={{ background: 'var(--glow-primary)' }}
                  />
                  <div className="h-[230px] w-[158px] [perspective:1200px] sm:h-[290px] sm:w-[198px] md:h-[350px] md:w-[240px]">
                    <TiltCard>
                    <div className="relative h-full w-full cursor-default">
                      {/* 透明卡面：可透出后方星盘 */}
                      <div
                        className="absolute inset-0 rounded-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                        style={{
                          background:
                            'linear-gradient(165deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.06))',
                          backdropFilter: 'blur(2px)',
                          WebkitBackdropFilter: 'blur(2px)',
                        }}
                      >
                        <div
                          className="relative flex h-full flex-col items-center justify-between p-4 text-center"
                          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}
                        >
                          <span className="text-[9px] tracking-[0.3em] text-accent/80 uppercase">
                            Arcana Archive
                          </span>
                          <div className="flex flex-col items-center gap-2">
                            <span className="font-display text-xl font-light tracking-[0.32em] text-frost/90 uppercase sm:text-2xl md:text-[1.7rem]">
                              The Fool
                            </span>
                          </div>
                          <span className="text-[9px] tracking-[0.25em] text-muted uppercase">
                            Digital Occult Tarot
                          </span>
                        </div>
                        {/* 全息流光层 */}
                        <div
                          className="card-back-holo pointer-events-none absolute inset-0 mix-blend-soft-light"
                          style={{
                            background:
                              'linear-gradient(115deg, transparent 30%, var(--glow-primary) 50%, transparent 70%)',
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.07] mix-blend-overlay bg-gradient-to-br from-white/60 via-transparent to-white/30" />
                      </div>
                      {/* 双重银光律动边框：外环顺时针流动、内环逆时针，均带月光白闪烁 */}
                      <div
                        className="silver-rim silver-rim-outer"
                        style={{ inset: '-7px', padding: '1.3px', borderRadius: '18px' }}
                        aria-hidden="true"
                      />
                      <div
                        className="silver-rim silver-rim-inner"
                        style={{ inset: '4px', padding: '1px', borderRadius: '8px' }}
                        aria-hidden="true"
                      />
                    </div>
                    </TiltCard>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- 左下：三个纵向窗口 ---- */}
            <div className="order-3 flex w-full flex-col gap-4 lg:order-none lg:col-start-1 lg:max-w-md lg:pl-8 xl:pl-12">
              {/* 窗口一：解读体系（默认只显示当前项，点击展开选择） */}
              <div className="glass-panel rise rise-4 relative rounded-2xl p-5 sm:p-6">
                <div className="mb-3.5 flex items-baseline justify-between">
                  <span className="font-display text-sm tracking-[0.2em] text-frost/90">解读体系</span>
                  <span className="text-[9px] tracking-[0.3em] text-muted/70 uppercase">
                    Systems
                  </span>
                </div>

                {/* 收起态：仅展示当前体系，点击展开 */}
                {!systemsOpen && (
                  <button
                    onClick={() => setSystemsOpen(true)}
                    className="group flex w-full touch-manipulation items-center gap-4 rounded-2xl border border-accent/50 bg-accent/15 px-5 py-3.5 text-left transition-all duration-300 hover:border-accent/70 hover:bg-accent/20 sm:py-4"
                  >
                    <span className="h-5 w-5 shrink-0 text-accent">{current.icon}</span>
                    <span className="font-display flex-1 text-base tracking-[0.25em] text-frost sm:text-lg">
                      {current.name}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-y-0.5"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}

                {/* 展开态：全部体系可选 */}
                {systemsOpen && (
                  <div className="flex flex-wrap gap-2.5">
                    {SYSTEMS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => {
                          setSystem(s.key);
                          setSystemsOpen(false);
                        }}
                        className={`flex touch-manipulation items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm tracking-wide transition-all duration-300 ${
                          system === s.key
                            ? 'border-accent/50 bg-accent/15 text-frost shadow-glow'
                            : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.18] hover:text-frost'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 shrink-0 ${system === s.key ? 'text-accent' : 'text-muted/80'}`}
                        >
                          {s.icon}
                        </span>
                        <span className="font-display tracking-[0.1em]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-3.5 min-h-[2.4em] text-xs leading-relaxed text-muted/90 sm:text-[13px]">
                  <span className="mr-1.5 text-accent/80">✦</span>
                  {current.desc}
                </p>
              </div>

              {/* 窗口二：开始占卜 */}
              <button
                onClick={() => router.push(current.route)}
                className="glass-panel rise rise-5 group relative touch-manipulation overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 sm:p-5"
                style={{ borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)' }}
              >
                <Sparkles />
                <span
                  className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 120% at 15% 50%, var(--glow-primary), transparent 70%)',
                  }}
                />
                <span className="relative z-10 flex items-center justify-between">
                  <span className="flex flex-col gap-1">
                    <span className="text-[9px] tracking-[0.3em] text-accent/75 uppercase">
                      Start Reading · {current.en}
                    </span>
                    <span className="font-display text-base tracking-[0.25em] text-frost sm:text-lg">
                      开始占卜
                    </span>
                    <span className="text-[11px] text-muted/90">静心默念，进入「{current.name}」</span>
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 transition-all duration-300 group-hover:translate-x-1 group-hover:border-accent/70 group-hover:bg-accent/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4 text-frost">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </button>

              {/* 窗口三：牌面解读 */}
              <button
                onClick={() => router.push('/tarot')}
                className="glass-panel rise rise-6 group relative touch-manipulation overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 sm:p-5"
              >
                <span className="relative z-10 flex items-center justify-between">
                  <span className="flex flex-col gap-1">
                    <span className="text-[9px] tracking-[0.3em] text-muted/70 uppercase">
                      Card Meanings
                    </span>
                    <span className="font-display text-base tracking-[0.25em] text-frost/90 sm:text-lg">
                      牌面解读
                    </span>
                    <span className="text-[11px] text-muted/90">大阿卡纳 · 元素 · 正逆位牌义速查</span>
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] transition-all duration-300 group-hover:translate-x-1 group-hover:border-white/[0.25]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4 text-frost/80">
                      <rect x="6" y="3" width="12" height="18" rx="2" />
                      <path d="M12 8.5a2 2 0 100 4 2 2 0 000-4zM9.5 17c.8-1.8 1.6-2.6 2.5-2.6s1.7.8 2.5 2.6" />
                    </svg>
                  </span>
                </span>
              </button>

              {/* 主题切换 + 呼吸入口 */}
              <div className="rise rise-6 mt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => applyTheme(t.key)}
                      className="group flex flex-col items-center gap-1.5"
                      aria-label={t.label}
                    >
                      <span
                        className={`h-5 w-5 rounded-full border transition-all duration-300 ${
                          theme === t.key
                            ? 'border-accent/70 shadow-glow scale-110'
                            : 'border-white/[0.12] group-hover:border-white/30'
                        }`}
                        style={{
                          background:
                            theme === t.key
                              ? 'linear-gradient(135deg, var(--accent), var(--accent-dim))'
                              : 'var(--surface)',
                        }}
                      />
                      <span
                        className={`text-[8px] tracking-[0.2em] uppercase transition-colors ${
                          theme === t.key ? 'text-frost' : 'text-muted/60 group-hover:text-muted'
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/online')}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-accent/45 bg-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:border-accent/70 hover:bg-white/[0.1]"
                  aria-label="呼吸"
                >
                  <span
                    className="breathe-ring-pulse absolute inset-0 rounded-full border border-accent/30"
                    aria-hidden="true"
                  />
                  <span className="font-display text-[10px] tracking-[0.25em] text-frost/90">呼吸</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
