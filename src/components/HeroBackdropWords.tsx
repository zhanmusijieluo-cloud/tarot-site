'use client';

/**
 * Hero 背景装饰浮动大字
 *
 * 可配置：修改下方 WORDS 数组即可换字、调位置、改颜色、变速
 * 每项字段：
 *   text      — 显示的文字
 *   className — Tailwind 定位/字号/颜色（用低透明度，如 text-accent/[0.07]）
 *   delay     — 动画延迟秒数（s）
 *   duration  — 动画周期秒数（s）
 *   drift     — 浮动幅度（px）
 */
const WORDS: {
  text: string;
  className: string;
  delay: number;
  duration: number;
  drift: number;
}[] = [
  { text: '命运', className: 'left-[-2%] top-[14%] text-[16rem] text-accent/[0.07]', delay: 0, duration: 11, drift: 18 },
  { text: 'TAROT', className: 'right-[-3%] top-[22%] text-[10rem] text-frost/[0.05]', delay: 1.2, duration: 13, drift: 24 },
  { text: '星尘', className: 'left-[10%] bottom-[14%] text-[14rem] text-accent/[0.06]', delay: 0.6, duration: 9, drift: 14 },
  { text: 'FATE', className: 'right-[12%] bottom-[22%] text-[9rem] text-frost/[0.04]', delay: 1.8, duration: 12, drift: 20 },
  { text: '静默', className: 'left-[40%] top-[42%] text-[12rem] text-accent/[0.04]', delay: 2.5, duration: 14, drift: 12 },
];

export default function HeroBackdropWords() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none" aria-hidden="true">
      {WORDS.map((w) => (
        <span
          key={w.text}
          className={`absolute font-display font-light tracking-widest whitespace-nowrap ${w.className}`}
          style={{
            animation: `float-word ${w.duration}s ease-in-out ${w.delay}s infinite`,
            ['--drift' as string]: `${w.drift}px`,
          }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}