'use client';

// ============================================================
// 星座符号矢量渲染 (AstroChart 手绘 path 同源)
// 根因: Windows emoji 字体会把 ♏♑♒ 等 Unicode 字符渲染成固定的紫红色 emoji,
// CSS color 完全无效 — 爸爸: 「不喜欢紫色的星座符号」
// 解决: 一律用矢量 path 画, 颜色 100% 受控
// ============================================================
import { GLYPH_PATHS, ZODIAC_GLYPH_NAMES } from '@/lib/astro/glyph-paths';

// 四元素色 (与线条盘墨黑主题 SHADE 同源): 火 土 风 水
export const SIGN_ELEM_HEX = ['#ff9c90', '#f0c470', '#84e89e', '#8cc0ff'];
export const SIGN_ELEM_OF = (si: number) => [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3][((si % 12) + 12) % 12];
export const signColor = (si: number) => SIGN_ELEM_HEX[SIGN_ELEM_OF(si)];

export default function SignGlyph({ si, color, size = 13, className = '' }: {
  si: number;
  color: string;
  size?: number;
  className?: string;
}) {
  const g = GLYPH_PATHS[ZODIAC_GLYPH_NAMES[((si % 12) + 12) % 12]];
  if (!g) return null;
  const sc = size / Math.max(g.w, g.h);
  return (
    <svg
      width={size + 5}
      height={size + 5}
      viewBox="0 0 24 24"
      className={`inline-block align-[-3px] ${className}`}
      aria-hidden="true"
    >
      <g
        transform={`translate(12,12) scale(${sc}) translate(${-g.cx},${-g.cy})`}
        fill="none"
        stroke={color}
        strokeWidth={1.35 / sc}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {g.ds.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}
